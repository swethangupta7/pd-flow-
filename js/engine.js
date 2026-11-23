import { STAGES } from './content/index.js';
import { DESIGNS } from './pdk.js';
import { floorplanModel, placementModel, powerModel, clockModel, routeModel, timingModel, round, clamp } from './engine-model.js';
import { buildGeometry } from './engine-geom.js';

export const DEFAULT_PARAMS = {
  util: 60,
  aspect: 1.0,
  margin: 12,
  macroMode: 'corners',
  halo: 8,
  channel: 14,
  clock: 10,
  density: 0.6,
  effort: 'med',
  ctsLevels: 3,
  skewTarget: 0.15,
  layers: 4,
  strapPitch: 40,
  strapW: 4,
  vtMix: 0.4,
  overlay: 'none',
  quality: 'high',
  grid: true,
  glow: true,
  animate: true,
};

export const METRIC_DEFS = [
  { id: 'wns', label: 'Setup WNS', unit: 'ns', good: (v) => v >= 0, warn: (v) => v < 0 && v > -0.4, fmt: (v) => v.toFixed(3), hint: 'Worst setup slack. Negative = failing path.' },
  { id: 'tns', label: 'Setup TNS', unit: 'ns', good: (v) => v >= 0, warn: (v) => v > -20, fmt: (v) => v.toFixed(1), hint: 'Total negative slack across all failing endpoints.' },
  { id: 'holdWns', label: 'Hold WNS', unit: 'ns', good: (v) => v >= 0, warn: (v) => v > -0.05, fmt: (v) => v.toFixed(3), hint: 'Worst hold slack at the fast corner.' },
  { id: 'skew', label: 'Clock skew', unit: 'ns', good: (v, p) => v <= p.skewTarget, warn: (v, p) => v <= p.skewTarget * 1.6, fmt: (v) => v.toFixed(3), hint: 'Max arrival difference between clock leaves.' },
  { id: 'cong', label: 'Congestion', unit: '×', good: (v) => v < 0.85, warn: (v) => v < 1.05, fmt: (v) => v.toFixed(2), hint: 'Track demand ÷ supply in the worst tile.' },
  { id: 'drc', label: 'DRC', unit: '', good: (v) => v === 0, warn: (v) => v < 40, fmt: (v) => String(Math.round(v)), hint: 'Design-rule violations after detailed route.' },
  { id: 'irPct', label: 'IR drop', unit: '%', good: (v) => v < 5, warn: (v) => v < 10, fmt: (v) => v.toFixed(1), hint: 'Worst supply voltage drop across the mesh.' },
  { id: 'power', label: 'Power', unit: 'mW', good: () => true, warn: () => true, fmt: (v) => v.toFixed(1), hint: 'Dynamic + leakage estimate at the target frequency.' },
  { id: 'wire', label: 'Wirelength', unit: 'mm', good: () => true, warn: () => true, fmt: (v) => (v / 1000).toFixed(2), hint: 'Total routed wire length.' },
  { id: 'cells', label: 'Instances', unit: '', good: () => true, warn: () => true, fmt: (v) => Math.round(v).toLocaleString(), hint: 'Standard cells including clock, decap and filler.' },
  { id: 'util', label: 'Utilisation', unit: '%', good: (v) => v < 78, warn: (v) => v < 88, fmt: (v) => v.toFixed(1), hint: 'Placed cell area ÷ usable core area.' },
  { id: 'area', label: 'Core area', unit: 'kµm²', good: () => true, warn: () => true, fmt: (v) => (v / 1000).toFixed(1), hint: 'Core box area from the floorplan.' },
];

export function computeState(designId, params, stageIdx) {
  const design = DESIGNS.find((d) => d.id === designId) || DESIGNS[0];
  const p = params;
  const fp = floorplanModel(design, p);
  const pl = placementModel(design, p, fp);
  const pw = powerModel(design, p, fp, pl);
  const ck = stageIdx >= 5 ? clockModel(design, p, fp) : null;
  const rt = stageIdx >= 6 ? routeModel(design, p, fp, pl) : null;
  const tm = stageIdx >= 1 ? timingModel(design, p, fp, pl, pw, ck, rt) : null;

  const instances = design.cells + (ck ? ck.clkCells : 0) +
    (stageIdx >= 8 ? Math.round(design.cells * 0.09) : 0) +
    (stageIdx >= 7 && tm ? Math.round(tm.holdEnds * 1.4) : 0);

  const metrics = {
    wns: tm ? tm.wns : 0,
    tns: tm ? tm.tns : 0,
    holdWns: tm ? tm.holdWns : 0,
    skew: ck ? ck.skew : 0,
    cong: pl.cong,
    drc: rt ? rt.drc : 0,
    irPct: stageIdx >= 3 ? pw.irPct : 0,
    power: pw.total + (ck ? ck.clkPower : 0),
    wire: rt ? rt.routedLen : stageIdx >= 4 ? pl.hpwl : 0,
    cells: stageIdx >= 1 ? instances : 0,
    util: stageIdx >= 2 ? fp.realUtil : 0,
    area: fp.coreArea,
  };

  const geom = buildGeometry(design, p, fp, pl, pw, ck, rt, tm, stageIdx, p.quality);
  return { design, p, fp, pl, pw, ck, rt, tm, metrics, geom, stageIdx };
}

export function stageVerdict(id, s) {
  const m = s.metrics;
  switch (id) {
    case 'rtl': return { ok: true, msg: 'Constraints linked. Clock defined on clk.' };
    case 'synth': return { ok: true, msg: `${s.design.cells.toLocaleString()} cells mapped to sky130_fd_sc_hd.` };
    case 'floorplan': return { ok: m.util < 88, msg: m.util < 88 ? `Core ${Math.round(s.fp.coreW)}×${Math.round(s.fp.coreH)} µm, ${s.fp.rows} rows.` : 'Utilisation too high — cells will not legalise.' };
    case 'powerplan': return { ok: m.irPct < 10, msg: m.irPct < 10 ? `Mesh built. Worst IR ${m.irPct.toFixed(1)}%.` : `IR drop ${m.irPct.toFixed(1)}% exceeds the 10% budget.` };
    case 'place': return { ok: s.pl.legal && m.cong < 1.05, msg: s.pl.legal ? (m.cong < 1.05 ? `Legal placement. Congestion ${m.cong.toFixed(2)}×.` : `Congestion ${m.cong.toFixed(2)}× — routing will struggle.`) : 'Placement did not legalise.' };
    case 'cts': return { ok: s.ck.skewOk, msg: s.ck.skewOk ? `Skew ${m.skew.toFixed(3)} ns within target.` : `Skew ${m.skew.toFixed(3)} ns above the ${s.p.skewTarget} ns target.` };
    case 'route': return { ok: m.drc === 0 && s.rt.unrouted === 0, msg: m.drc === 0 && s.rt.unrouted === 0 ? 'All nets routed, zero DRC.' : `${m.drc} DRC, ${s.rt.unrouted} unrouted nets.` };
    case 'sta': return { ok: m.wns >= 0 && m.holdWns >= 0, msg: m.wns >= 0 && m.holdWns >= 0 ? 'Setup and hold clean at both corners.' : `Setup ${m.wns.toFixed(3)} ns, hold ${m.holdWns.toFixed(3)} ns.` };
    case 'signoff': return { ok: m.drc === 0 && m.wns >= 0 && m.holdWns >= 0 && m.irPct < 10, msg: m.drc === 0 && m.wns >= 0 && m.holdWns >= 0 && m.irPct < 10 ? 'DRC / LVS / timing clean. GDSII ready.' : 'Signoff blocked — fix the failing checks first.' };
    default: return { ok: true, msg: '' };
  }
}

export function stageLog(id, s) {
  const d = s.design, p = s.p, m = s.metrics, L = [];
  const t = (tag, msg) => L.push({ tag, msg });
  const n = (v, f = 2) => Number(v).toFixed(f);
  switch (id) {
    case 'rtl':
      t('yosys', `read_verilog rtl/${d.rtl}`);
      t('yosys', `hierarchy -check -top ${d.name}`);
      t('sta', `read_liberty sky130_fd_sc_hd__tt_025C_1v80.lib`);
      t('sta', `create_clock -name core_clk -period ${n(p.clock)} [get_ports clk]`);
      t('sta', `check_setup: ${d.ios} ports constrained, 0 unconstrained endpoints`);
      t('ok', `RTL + SDC linked. ${d.flops} registers found.`);
      break;
    case 'synth':
      t('yosys', `synth -top ${d.name}`);
      t('yosys', `dfflibmap -liberty $LIB`);
      t('abc', `abc -liberty $LIB -D ${Math.round(p.clock * 1000)}`);
      t('abc', `Mapping to sky130_fd_sc_hd ... ${d.cells} cells`);
      t('yosys', `stat: ${d.cells} instances, ${d.flops} flops, depth ${d.depth}`);
      t('ok', `Netlist written. Cell area ${n(s.fp.cellArea, 0)} µm².`);
      break;
    case 'floorplan':
      t('ifp', `initialize_floorplan -utilization ${p.util} -aspect_ratio ${n(p.aspect)} -core_space ${p.margin}`);
      t('ifp', `Die ${n(s.fp.dieW, 1)} × ${n(s.fp.dieH, 1)} µm`);
      t('ifp', `Core ${n(s.fp.coreW, 1)} × ${n(s.fp.coreH, 1)} µm`);
      t('ifp', `make_rows: ${s.fp.rows} rows × ${s.fp.sites} sites (unithd 0.46 × 2.72)`);
      t('pin', `place_pins: ${d.ios} pins on met2/met3`);
      t(m.util < 88 ? 'ok' : 'warn', `Real utilisation ${n(m.util, 1)}%`);
      break;
    case 'powerplan':
      t('mpl', `Macro placement mode: ${p.macroMode}, halo ${p.halo} µm, channel ${p.channel} µm`);
      for (const mc of s.geom.macros) t('mpl', `  ${mc.name} @ (${n(mc.x, 0)}, ${n(mc.y, 0)}) R0`);
      t('pdn', `add_pdn_ring -layers {met4 met5} -widths 8`);
      t('pdn', `add_pdn_stripe -layer met4 -width ${p.strapW} -pitch ${p.strapPitch}`);
      t('pdn', `add_pdn_stripe -layer met1 -width 0.48 -followpins`);
      t('pdn', `pdngen: ${s.geom.straps.length} straps, ${s.geom.rails.length} rail groups`);
      t(m.irPct < 10 ? 'ok' : 'err', `analyze_power_grid: worst IR drop ${n(m.irPct, 1)}% (${n(1.8 * m.irPct / 100, 3)} V of 1.800 V)`);
      break;
    case 'place':
      t('gpl', `global_placement -density ${n(p.density)} -timing_driven -routability_driven`);
      t('gpl', `HPWL ${n(s.pl.hpwl / 1000, 2)} mm, effort ${p.effort}`);
      t('dpl', `detailed_placement: legalising ${m.cells.toLocaleString()} instances`);
      t(s.pl.legal ? 'ok' : 'err', `check_placement: ${s.pl.legal ? '0 overlaps, all on-site' : 'overlaps remain'}`);
      t(m.cong < 1.05 ? 'ok' : 'warn', `Congestion peak ${n(m.cong)}× — ${s.pl.hotTiles} hot tiles`);
      break;
    case 'cts':
      t('cts', `clock_tree_synthesis -root_buf clkbuf_8 -max_skew ${p.skewTarget}`);
      t('cts', `Sink clustering: ${d.flops} sinks, ${p.ctsLevels} buffer levels`);
      t('cts', `Inserted ${s.ck.clkCells} clock cells`);
      t('cts', `Insertion delay ${n(s.ck.latency, 3)} ns`);
      t(s.ck.skewOk ? 'ok' : 'warn', `Global skew ${n(s.ck.skew, 3)} ns (target ${p.skewTarget})`);
      t('sta', `set_propagated_clock [all_clocks]; uncertainty → 0.05 ns`);
      t(m.holdWns < 0 ? 'warn' : 'ok', `Hold check: ${m.holdWns < 0 ? `${s.tm.holdEnds} failing endpoints` : 'clean'}`);
      break;
    case 'route':
      t('grt', `global_route -congestion_iterations 50`);
      t('grt', `Guides on met1..met${p.layers}`);
      t('drt', `detailed_route -bottom_routing_layer met1 -top_routing_layer met${p.layers}`);
      t('drt', `${n(s.rt.routedLen / 1000, 2)} mm wire, ${s.rt.vias.toLocaleString()} vias`);
      t(s.rt.unrouted ? 'err' : 'ok', `Unrouted nets: ${s.rt.unrouted}`);
      t(s.rt.drc ? 'err' : 'ok', `DRC violations: ${s.rt.drc}`);
      t(s.rt.antenna ? 'warn' : 'ok', `check_antennas: ${s.rt.antenna} violations`);
      t('rcx', `extract_parasitics → route/parasitics.spef`);
      break;
    case 'sta':
      t('sta', `read_spef route/parasitics.spef`);
      t('sta', `report_checks -path_delay max -corner slow`);
      t(m.wns >= 0 ? 'ok' : 'err', `  WNS ${n(m.wns, 3)} ns   TNS ${n(m.tns, 1)} ns   ${s.tm.endpoints} failing endpoints`);
      t('sta', `report_checks -path_delay min -corner fast`);
      t(m.holdWns >= 0 ? 'ok' : 'err', `  Hold WNS ${n(m.holdWns, 3)} ns   ${s.tm.holdEnds} failing endpoints`);
      t('rsz', `repair_timing -setup -hold  (vt mix ${Math.round(p.vtMix * 100)}% LVT)`);
      t(s.tm.slewViol ? 'warn' : 'ok', `max_slew / max_cap violators: ${s.tm.slewViol}`);
      break;
    case 'signoff':
      t('fin', `filler_placement + place_tapcells -distance 14`);
      t('fin', `write_def outputs/final.def; write_verilog outputs/final.v`);
      t('magic', `gds read outputs/design.gds; drc check`);
      t(m.drc ? 'err' : 'ok', `DRC count total: ${m.drc}`);
      t('netgen', `lvs final.spice vs final.v`);
      t(m.drc ? 'warn' : 'ok', `LVS: ${m.drc ? 'net mismatches remain' : 'circuits match uniquely'}`);
      t(m.wns >= 0 && m.holdWns >= 0 && m.drc === 0 && m.irPct < 10 ? 'ok' : 'err',
        m.wns >= 0 && m.holdWns >= 0 && m.drc === 0 && m.irPct < 10
          ? `TAPEOUT READY — ${d.name}.gds streamed out.`
          : 'TAPEOUT BLOCKED — resolve failing checks.');
      break;
  }
  return L;
}

export const STAGE_IDS = STAGES.map((s) => s.id);
export { clamp, round };