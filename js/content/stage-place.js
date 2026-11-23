export default {
  id: 'place',
  n: 5,
  name: 'Placement',
  short: 'PL',
  tool: 'OpenROAD (gpl / dpl)',
  color: '#ff4d9d',
  dir: 'placement/',
  inputs: ['powerplan.odb', 'base.sdc', 'tech.lef'],
  outputs: ['placed.odb', 'placement.rpt', 'congestion.rpt'],
  summary: 'Give every cell a legal coordinate. Wirelength, congestion and the first real timing appear.',
  realWork: [
    'Placement is where most of your timing and congestion is decided. Global placement spreads cells to minimise wirelength; detailed placement snaps them onto rows and sites legally.',
    'You iterate here more than anywhere else. Change utilisation, change density, add a placement blockage in a hot spot, re-run, read the congestion map.',
    'The deliverable is a legal placement with acceptable congestion and a timing report you believe. If congestion is red, routing will fail later — fix it now, not after two hours of routing.',
  ],
  circuit: [
    'A wire is a capacitor. Two parallel plates plus fringe to the substrate. Longer wire = more capacitance = more charge to move = more delay.',
    'The driving gate has finite current. Delay is roughly the time to charge that capacitance: R_driver × C_wire, plus the wire\'s own distributed RC.',
    'So placement is literally deciding how much capacitance each net must drive. Pulling connected cells together shortens wires and buys timing.',
    'But packing cells tightly removes the routing space between them. Demand for tracks rises above supply, and the router must detour — which adds wire back.',
  ],
  topic: [
    'Global placement (gpl) treats cells as a smooth density field and minimises estimated wirelength (HPWL) subject to a density target.',
    'Detailed placement (dpl) legalises: every cell on a row, on a site, no overlaps, orientation valid.',
    'Density target is not utilisation. Utilisation is the average; density is the local spread limit the global placer must respect.',
    'Timing-driven placement weights critical nets more heavily, pulling their endpoints together at the cost of total wirelength.',
    'Congestion is measured per global-routing tile: required tracks ÷ available tracks. Above 1.0 the router cannot fit and must detour or fail.',
  ],
  keys: [
    'HPWL (half-perimeter wirelength) is the fast estimate placement optimises.',
    'High utilisation → short average wires but high congestion. There is a sweet spot.',
    'Timing-driven mode trades total wirelength for critical-path wirelength.',
    'Read the congestion map before routing. Red tiles are future DRCs.',
  ],
  commands: [
    { label: 'global + detailed', code: 'global_placement -density 0.60 -timing_driven \\\n  -routability_driven -pad_left 1 -pad_right 1\nestimate_parasitics -placement\nreport_checks -path_delay max\n\ndetailed_placement\ncheck_placement -verbose' },
    { label: 'congestion + wirelength', code: 'global_route -guide_file route/guide.guide -congestion_report_file congestion.rpt\nreport_wire_length\nreport_congestion' },
    { label: 'fix a hot spot', code: 'create_placement_blockage -bbox {120 140 180 200}\nglobal_placement -density 0.55\ndetailed_placement' },
  ],
  failures: [
    { symptom: 'check_placement reports overlaps', cause: 'Detailed placement did not converge, or a blockage conflicts with rows.', fix: 'Re-run detailed_placement with more padding; verify blockages do not cover entire rows.' },
    { symptom: 'Congestion > 1.0 in the macro channel', cause: 'Channel too narrow for the nets crossing it.', fix: 'Widen the channel, spread macros, or lower local density with a blockage.' },
    { symptom: 'Setup fails after placement but passed at synthesis', cause: 'Real wire parasitics replaced estimates.', fix: 'This is normal. Enable timing-driven placement, then buffer long nets; re-check the deepest cones.' },
  ],
  interview: [
    {
      q: 'What is the difference between global and detailed placement?',
      a: 'Global placement finds approximate positions that minimise wirelength while keeping cell density under a target. It allows overlap. Detailed placement then makes it legal — every cell on a row, on a site, no overlap, correct orientation. Global optimises quality, detailed guarantees manufacturability.',
      followups: [
        { q: 'Why does timing get worse after placement?', a: 'Before placement the tool used estimated wire loads. Now it extracts real parasitics from actual coordinates. Long nets that were assumed short become visible.' },
        { q: 'What is HPWL?', a: 'Half the perimeter of the bounding box of a net\'s pins. It is a cheap wirelength estimate that correlates well with routed length, so the placer can optimise it millions of times.' },
        { q: 'Utilisation vs density target?', a: 'Utilisation is the average fill of the core. The density target is the local limit the placer must respect in each region. You can have 60% average utilisation but a 90% local hot spot.' },
      ],
    },
    {
      q: 'How do you fix congestion?',
      a: 'First find where and why. Usually a macro channel, a wide mux, or a pin-dense region. Then lower local density with a placement blockage, widen the channel, spread the pins, or give the router more layers. Raising utilisation everywhere is the wrong move — it makes it worse.',
      followups: [
        { q: 'Why does congestion cause timing problems too?', a: 'The router detours around the blocked region. Detour means longer wire, more capacitance, more delay. Congestion and timing are the same problem seen from two sides.' },
      ],
    },
  ],
  quiz: [
    { q: 'Detailed placement mainly guarantees:', options: ['Minimum wirelength', 'Legal, non-overlapping, on-site cells', 'Zero clock skew', 'No DRCs after routing'], answer: 1, why: 'Legalisation is its job; wirelength quality comes from global placement.' },
    { q: 'Congestion ratio above 1.0 means:', options: ['The design is fast', 'Track demand exceeds supply in that tile', 'Utilisation is too low', 'The clock is unbalanced'], answer: 1, why: 'More nets need tracks than the tile has, forcing detours or failures.' },
    { q: 'Raising utilisation from 60% to 85% typically:', options: ['Reduces congestion', 'Increases congestion and DRC risk', 'Has no effect', 'Removes hold violations'], answer: 1, why: 'Less whitespace means fewer routing tracks between cells.' },
  ],
};