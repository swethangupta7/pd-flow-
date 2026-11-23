import rtl from './stage-rtl.js';
import synth from './stage-synth.js';
import floorplan from './stage-floorplan.js';
import powerplan from './stage-powerplan.js';
import place from './stage-place.js';
import cts from './stage-cts.js';
import route from './stage-route.js';
import sta from './stage-sta.js';
import signoff from './stage-signoff.js';

export const STAGES = [rtl, synth, floorplan, powerplan, place, cts, route, sta, signoff];
export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));

// What "5 years of experience" actually means, as a checklist the lab tracks.
export const COMPETENCIES = [
  { id: 'fp', label: 'Size a core from cell area and utilisation', stages: ['synth', 'floorplan'] },
  { id: 'macro', label: 'Place macros with halos and legal channels', stages: ['powerplan'] },
  { id: 'pdn', label: 'Build a power mesh and reason about IR / EM', stages: ['powerplan'] },
  { id: 'cong', label: 'Read a congestion map and fix the cause', stages: ['place', 'route'] },
  { id: 'skew', label: 'Explain skew, latency and useful skew', stages: ['cts'] },
  { id: 'setup', label: 'Close setup across corners with real SPEF', stages: ['sta'] },
  { id: 'hold', label: 'Find and fix hold at the fast corner', stages: ['cts', 'sta'] },
  { id: 'drc', label: 'Drive DRC and unrouted nets to zero', stages: ['route', 'signoff'] },
  { id: 'eco', label: 'Apply a surgical ECO without a full re-run', stages: ['sta'] },
  { id: 'sign', label: 'Explain DRC vs LVS and the tapeout pack', stages: ['signoff'] },
];

export const GLOSSARY = [
  ['Utilisation', 'Placed standard-cell area divided by usable core area.'],
  ['HPWL', 'Half-perimeter wirelength — the fast estimate placement optimises.'],
  ['WNS', 'Worst negative slack. The single worst failing path.'],
  ['TNS', 'Total negative slack. Sum of all failing slacks — how much work is left.'],
  ['Skew', 'Difference in clock arrival time between two flops.'],
  ['Insertion delay', 'Clock latency from root to a leaf flop.'],
  ['SPEF', 'Extracted resistance and capacitance of the routed nets.'],
  ['IR drop', 'Voltage lost across the resistance of the power grid.'],
  ['EM', 'Electromigration — metal atoms moved by high current density.'],
  ['ECO', 'A late, minimal netlist or layout change.'],
  ['DRC', 'Design rule check — can the foundry build these shapes.'],
  ['LVS', 'Layout vs schematic — is it the circuit you designed.'],
  ['NDR', 'Non-default routing rule, e.g. wider wires for clock nets.'],
  ['MMMC', 'Multi-mode multi-corner analysis.'],
  ['Halo', 'Keep-out region around a macro so its pins stay reachable.'],
  ['Decap', 'Capacitor cell supplying fast local switching current.'],
  ['Tap cell', 'Well-to-supply tie that prevents latch-up.'],
  ['Antenna effect', 'Process charge on a long wire damaging a thin gate oxide.'],
];