import { PDK, METALS, CELL_CLASSES } from './pdk.js';
import { mulberry32, clamp, lerp } from './engine-model.js';

// Geometry is generated once per state change, in micrometre space.
// The renderer only scales it — no per-frame allocation.
export function buildGeometry(design, p, fp, pl, pw, ck, rt, tm, stageIdx, quality) {
  const rnd = mulberry32(design.cells + Math.round(p.util * 7) + p.layers * 31 + p.ctsLevels * 17 + design.macros);
  const q = quality === 'high' ? 1 : quality === 'med' ? 0.62 : 0.34;
  const g = { macros: [], pins: [], cells: [], straps: [], rails: [], clock: null, routes: [], viols: [], field: null };

  // --- macros ---
  const mW = 155, mH = 155;
  for (let i = 0; i < design.macros; i++) {
    let x, y;
    const inset = p.halo + 6;
    if (p.macroMode === 'corners') {
      const cx = i % 2, cy = Math.floor(i / 2) % 2;
      x = cx ? fp.coreW - mW - inset : inset;
      y = cy ? fp.coreH - mH - inset : inset;
    } else if (p.macroMode === 'center') {
      const cols = Math.ceil(Math.sqrt(design.macros));
      const cx = i % cols, cy = Math.floor(i / cols);
      const gap = p.channel;
      const totalW = cols * mW + (cols - 1) * gap;
      x = (fp.coreW - totalW) / 2 + cx * (mW + gap);
      y = (fp.coreH - mH) / 2 + cy * (mH + gap);
    } else {
      const cols = Math.ceil(Math.sqrt(design.macros));
      const cx = i % cols, cy = Math.floor(i / cols);
      x = inset + cx * ((fp.coreW - 2 * inset - mW) / Math.max(1, cols - 1 || 1));
      y = inset + cy * ((fp.coreH - 2 * inset - mH) / Math.max(1, Math.ceil(design.macros / cols) - 1 || 1));
    }
    g.macros.push({
      x: clamp(x, 2, Math.max(2, fp.coreW - mW - 2)),
      y: clamp(y, 2, Math.max(2, fp.coreH - mH - 2)),
      w: mW, h: mH, halo: p.halo, name: `sram_${i}`,
    });
  }

  const inMacro = (x, y, pad = 0) => g.macros.some((m) =>
    x > m.x - m.halo - pad && x < m.x + m.w + m.halo + pad &&
    y > m.y - m.halo - pad && y < m.y + m.h + m.halo + pad);

  // --- IO pins ---
  const pinCount = Math.min(design.ios, 220);
  for (let i = 0; i < pinCount; i++) {
    const side = i % 4;
    const t = (Math.floor(i / 4) + 0.5) / Math.ceil(pinCount / 4);
    const j = (rnd() - 0.5) * 4;
    if (side === 0) g.pins.push({ x: t * fp.coreW, y: -1.5 + j * 0.2, side });
    else if (side === 1) g.pins.push({ x: fp.coreW + 1.5 + j * 0.2, y: t * fp.coreH, side });
    else if (side === 2) g.pins.push({ x: t * fp.coreW, y: fp.coreH + 1.5 + j * 0.2, side });
    else g.pins.push({ x: -1.5 + j * 0.2, y: t * fp.coreH, side });
  }

  // --- standard cells (sampled, row-snapped) ---
  const cellTarget = Math.round(clamp(design.cells * 0.52 * q, 200, 9000));
  const rowStep = Math.max(1, Math.floor(fp.rows / Math.min(fp.rows, 90)));
  let placed = 0, guard = 0;
  while (placed < cellTarget && guard < cellTarget * 12) {
    guard++;
    const row = Math.floor(rnd() * fp.rows / rowStep) * rowStep;
    const y = row * PDK.siteH;
    const x = Math.floor(rnd() * fp.sites) * PDK.siteW;
    if (inMacro(x, y, 2)) continue;
    const r = rnd();
    let acc = 0, cls = CELL_CLASSES[0];
    for (const c of CELL_CLASSES) { acc += c.share; if (r <= acc) { cls = c; break; } }
    const wSites = cls.id === 'seq' ? 12 + Math.floor(rnd() * 8) : cls.id === 'clk' ? 8 : 3 + Math.floor(rnd() * 7);
    const slack = tm ? tm.wns : 0;
    const crit = cls.id === 'seq' && rnd() < clamp(-slack / 1.6, 0, 0.7);
    g.cells.push({ x, y, w: wSites * PDK.siteW, h: PDK.siteH, c: cls.color, k: cls.id, crit });
    placed++;
  }

  // --- power grid ---
  if (stageIdx >= 3) {
    const pitch = p.strapPitch;
    for (let x = pitch / 2; x < fp.coreW; x += pitch) g.straps.push({ x1: x, y1: 0, x2: x, y2: fp.coreH, v: true, w: p.strapW });
    for (let y = pitch / 2; y < fp.coreH; y += pitch) g.straps.push({ x1: 0, y1: y, x2: fp.coreW, y2: y, v: false, w: p.strapW });
    const railStep = Math.max(2, Math.round(fp.rows / 60)) * PDK.siteH;
    for (let y = 0; y < fp.coreH; y += railStep) g.rails.push(y);
  }

  // --- clock tree ---
  if (stageIdx >= 5 && ck) {
    const nodes = [], edges = [];
    const root = { x: fp.coreW / 2, y: fp.coreH / 2, lvl: 0, lat: 0 };
    nodes.push(root);
    let frontier = [root];
    const branch = p.ctsLevels <= 2 ? 4 : 3;
    for (let l = 1; l <= p.ctsLevels; l++) {
      const next = [];
      for (const parent of frontier) {
        for (let b = 0; b < branch; b++) {
          const ang = (b / branch) * Math.PI * 2 + rnd() * 0.9 + l;
          const rad = Math.sqrt(fp.coreArea) / (2.1 * Math.pow(1.75, l - 1));
          const n = {
            x: clamp(parent.x + Math.cos(ang) * rad, 4, fp.coreW - 4),
            y: clamp(parent.y + Math.sin(ang) * rad, 4, fp.coreH - 4),
            lvl: l, lat: ck.latency * (l / p.ctsLevels) + (rnd() - 0.5) * ck.skew,
          };
          nodes.push(n); edges.push([parent, n]); next.push(n);
        }
      }
      frontier = next;
    }
    const leaves = [];
    const leafCount = Math.round(clamp(design.flops * 0.18 * q, 40, 520));
    for (let i = 0; i < leafCount; i++) {
      const parent = frontier[Math.floor(rnd() * frontier.length)];
      const n = {
        x: clamp(parent.x + (rnd() - 0.5) * fp.coreW * 0.16, 2, fp.coreW - 2),
        y: clamp(parent.y + (rnd() - 0.5) * fp.coreH * 0.16, 2, fp.coreH - 2),
        lvl: p.ctsLevels + 1, lat: ck.latency + (rnd() - 0.5) * ck.skew * 2,
      };
      leaves.push(n); edges.push([parent, n]);
    }
    g.clock = { nodes, edges, leaves };
  }

  // --- routes ---
  if (stageIdx >= 6) {
    const netCount = Math.round(clamp(design.cells * 0.07 * q, 120, 1500));
    for (let i = 0; i < netCount; i++) {
      const a = g.cells[Math.floor(rnd() * g.cells.length)];
      const b = g.cells[Math.floor(rnd() * g.cells.length)];
      if (!a || !b) continue;
      const li = 1 + Math.floor(rnd() * p.layers);
      const m = METALS[clamp(li, 1, 5)];
      const x1 = a.x + a.w / 2, y1 = a.y + a.h / 2, x2 = b.x + b.w / 2, y2 = b.y + b.h / 2;
      const mid = rnd() < 0.5 ? { x: x2, y: y1 } : { x: x1, y: y2 };
      g.routes.push({ x1, y1, mx: mid.x, my: mid.y, x2, y2, color: m.color, dash: m.dash, layer: li, crit: rnd() < 0.06 });
    }
  }

  // --- violation markers ---
  if (stageIdx >= 6 && rt) {
    const n = Math.round(clamp(rt.drc / 12, 0, 220));
    for (let i = 0; i < n; i++) {
      const hot = rnd() < 0.6 && g.macros.length;
      let x, y;
      if (hot) {
        const m = g.macros[Math.floor(rnd() * g.macros.length)];
        x = m.x + (rnd() < 0.5 ? -m.halo : m.w + m.halo) + (rnd() - 0.5) * 12;
        y = m.y + rnd() * m.h;
      } else { x = rnd() * fp.coreW; y = rnd() * fp.coreH; }
      g.viols.push({ x: clamp(x, 0, fp.coreW), y: clamp(y, 0, fp.coreH), t: rnd() < 0.7 ? 'drc' : 'ant' });
    }
  }
  if (stageIdx >= 7 && tm) {
    const n = Math.round(clamp(tm.endpoints / 6, 0, 160));
    for (let i = 0; i < n; i++) {
      const c = g.cells[Math.floor(rnd() * g.cells.length)];
      if (c) g.viols.push({ x: c.x, y: c.y, t: 'setup' });
    }
  }

  // --- overlay field ---
  const N = 26;
  const field = new Float32Array(N * N);
  for (let iy = 0; iy < N; iy++) {
    for (let ix = 0; ix < N; ix++) {
      const x = (ix + 0.5) / N * fp.coreW, y = (iy + 0.5) / N * fp.coreH;
      let v = 0;
      const nearMacro = g.macros.reduce((acc, m) => {
        const dx = Math.max(m.x - x, 0, x - (m.x + m.w));
        const dy = Math.max(m.y - y, 0, y - (m.y + m.h));
        return acc + Math.exp(-(dx * dx + dy * dy) / 2600);
      }, 0);
      const edge = 1 - Math.min(x, fp.coreW - x, y, fp.coreH - y) / (Math.min(fp.coreW, fp.coreH) / 2);
      const noise = rnd() * 0.22;
      if (p.overlay === 'congestion') v = clamp(pl.cong * (0.55 + nearMacro * 0.8 + noise) - 0.15, 0, 1.6) / 1.6;
      else if (p.overlay === 'ir') v = clamp((1 - edge) * pw.irPct / 14 + nearMacro * 0.22 + noise * 0.2, 0, 1);
      else if (p.overlay === 'timing') v = clamp((-tm.wns) / 1.8 * (0.5 + nearMacro * 0.6 + noise), 0, 1);
      else if (p.overlay === 'skew') v = ck ? clamp(Math.abs(Math.hypot(x - fp.coreW / 2, y - fp.coreH / 2)) / (Math.sqrt(fp.coreArea) / 2) * ck.skew / 0.5, 0, 1) : 0;
      field[iy * N + ix] = v;
    }
  }
  g.field = { data: field, n: N };
  return g;
}