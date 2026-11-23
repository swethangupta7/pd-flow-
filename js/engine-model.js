import { PDK } from './pdk.js';

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const round = (v, d = 2) => Number(v.toFixed(d));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---- floorplan -------------------------------------------------------------
export function floorplanModel(design, p) {
  const cellArea = design.cells * PDK.cellAreaAvg * (1 + 0.06 * (p.vtMix - 0.5));
  const macroArea = design.macros * 24000;
  const usable = cellArea / (p.util / 100);
  const coreArea = usable + macroArea;
  const coreW = Math.sqrt(coreArea / p.aspect);
  const coreH = coreW * p.aspect;
  const dieW = coreW + 2 * p.margin;
  const dieH = coreH + 2 * p.margin;
  const rows = Math.max(4, Math.floor(coreH / PDK.siteH));
  const sites = Math.max(8, Math.floor(coreW / PDK.siteW));
  const realUtil = (cellArea / (coreW * coreH - macroArea)) * 100;
  return { cellArea, macroArea, coreArea, coreW, coreH, dieW, dieH, rows, sites, realUtil, margin: p.margin };
}

// ---- placement -------------------------------------------------------------
export function placementModel(design, p, fp) {
  const u = p.util / 100;
  // aspect penalty: square is best, thin cores force detours
  const aspectPen = 1 + 0.22 * Math.pow(Math.abs(Math.log(p.aspect)), 1.35);
  const macroPen = 1 + 0.05 * design.macros * (p.macroMode === 'center' ? 1.8 : p.macroMode === 'corners' ? 0.7 : 1);
  const effortGain = p.effort === 'high' ? 0.88 : p.effort === 'med' ? 1 : 1.14;
  const spread = lerp(1.16, 0.9, (p.density - 0.35) / 0.5);
  const hpwl = 0.62 * Math.sqrt(fp.cellArea) * Math.sqrt(design.cells) *
    aspectPen * macroPen * effortGain * spread * lerp(1.1, 0.94, u);

  // congestion: demand rises steeply with utilisation, falls with layers/effort
  const layerSupply = 0.55 + 0.16 * p.layers;
  const macroCong = design.macros * (p.macroMode === 'center' ? 0.11 : p.macroMode === 'corners' ? 0.035 : 0.06);
  const channelRelief = clamp((p.channel - 6) / 30, 0, 0.35);
  const effortRelief = p.effort === 'high' ? 0.16 : p.effort === 'med' ? 0.07 : 0;
  const cong = clamp(
    (Math.pow(u, 2.5) * 2.35 + macroCong + 0.1) / layerSupply
    - channelRelief - effortRelief,
    0.05, 2.4
  );
  const hotTiles = Math.round(clamp((cong - 0.72) * 240, 0, 420));
  const legal = p.util <= 88 && cong < 2.1;
  return { hpwl, cong, hotTiles, legal, aspectPen };
}

// ---- power -----------------------------------------------------------------
export function powerModel(design, p, fp, pl) {
  const freq = 1000 / p.clock; // MHz
  const dyn = design.cells * 0.0000185 * freq * lerp(0.82, 1.28, p.vtMix) *
    (1 + 0.05 * p.ctsLevels) * (1 + pl.cong * 0.08);
  const leak = design.cells * 0.0000042 * lerp(0.35, 3.1, Math.pow(p.vtMix, 1.7));
  const total = dyn + leak; // mW
  const strapSupply = (p.strapW / 4) * (40 / p.strapPitch) * (0.6 + 0.12 * p.layers);
  const irPct = clamp((total / Math.sqrt(fp.coreArea)) * 46 / strapSupply, 0.6, 26);
  const emRisk = clamp(irPct / 9 + (p.strapW < 2 ? 0.4 : 0), 0, 2.2);
  return { dyn, leak, total, irPct, emRisk, freq };
}

// ---- clock tree ------------------------------------------------------------
export function clockModel(design, p, fp) {
  const span = Math.sqrt(fp.coreArea);
  const levels = p.ctsLevels;
  const balance = Math.pow(0.62, levels - 1);
  const skew = clamp(span * 0.00135 * balance * (1 + 0.06 * design.macros) *
    lerp(1.35, 0.85, clamp((p.skewTarget === 0 ? 0.5 : 0.15 / p.skewTarget), 0, 1)), 0.008, 1.6);
  const latency = 0.09 * levels + span * 0.00042 * (1 + 0.1 * levels);
  const clkCells = Math.round(design.flops / (26 - 3 * levels) * levels * 0.55) + 8;
  const clkPower = clkCells * 0.0000412 * (1000 / p.clock);
  const skewOk = skew <= p.skewTarget * 1.05;
  return { skew, latency, clkCells, clkPower, skewOk, levels };
}

// ---- routing ---------------------------------------------------------------
export function routeModel(design, p, fp, pl) {
  const routedLen = pl.hpwl * lerp(1.22, 1.06, clamp((p.layers - 2) / 3, 0, 1)) *
    (1 + clamp(pl.cong - 0.8, 0, 1.4) * 0.34);
  const vias = Math.round(design.cells * lerp(3.4, 2.1, clamp((p.layers - 2) / 3, 0, 1)));
  const drcBase = Math.pow(clamp(pl.cong - 0.78, 0, 1.6), 2.1) * 900;
  const pinDrc = design.macros * (p.macroMode === 'center' ? 26 : 9);
  const drc = Math.round(clamp(drcBase + pinDrc * (p.halo < 6 ? 1.8 : 0.6), 0, 4200));
  const unrouted = Math.round(clamp((pl.cong - 1.15) * 90, 0, 260));
  const antenna = Math.round(clamp(routedLen / 5200 - p.layers * 1.2, 0, 90));
  return { routedLen, vias, drc, unrouted, antenna };
}

// ---- timing ----------------------------------------------------------------
export function timingModel(design, p, fp, pl, pw, ck, rt) {
  const depthDelay = design.depth * lerp(0.108, 0.062, p.vtMix);
  const wireDelay = (rt ? rt.routedLen : pl.hpwl) / Math.max(1, design.cells) * 1.55;
  const irPenalty = pw.irPct * 0.021;
  const congPenalty = clamp(pl.cong - 0.85, 0, 1.5) * 0.42;
  const skewPenalty = ck ? ck.skew * 0.55 : 0.12;
  const uncertainty = ck ? 0.05 : 0.25;
  const arrival = depthDelay + wireDelay + irPenalty + congPenalty;
  const required = p.clock - uncertainty - 0.14;
  const wns = required - arrival - skewPenalty;
  const failFrac = clamp(-wns / Math.max(0.6, p.clock * 0.32), 0, 0.85);
  const endpoints = Math.round(design.flops * failFrac * 0.6);
  const tns = -round(endpoints * Math.max(0, -wns) * 0.46, 2);
  // hold: real skew after CTS attacks short paths
  const holdSkew = ck ? ck.skew : 0;
  const holdWns = ck ? 0.13 - holdSkew * 0.78 : 0.09;
  const holdEnds = ck ? Math.round(design.flops * clamp(-holdWns / 0.14, 0, 0.4) * 0.35) : 0;
  const slewViol = Math.round(clamp(pl.cong * 26 + pw.irPct * 3.4 - p.vtMix * 12, 0, 320));
  return { arrival, required, wns, tns, endpoints, holdWns, holdEnds, slewViol, uncertainty };
}