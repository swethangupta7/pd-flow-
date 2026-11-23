export default {
  id: 'floorplan',
  n: 3,
  name: 'Floorplan',
  short: 'FP',
  tool: 'OpenROAD (ifp)',
  color: '#a3e635',
  dir: 'floorplan/',
  inputs: ['picorv32_netlist.v', 'tech.lef', 'macro.lef', 'base.sdc'],
  outputs: ['floorplan.odb', 'pin_placement.cfg', 'rows.rpt'],
  summary: 'Draw the die, the core box and the placement rows. Place the IO pins.',
  realWork: [
    'This is where you decide the shape of the block. Die size, core margins, aspect ratio, row orientation, pin sides.',
    'You get the shape from the top-level team: your block must fit a given box and its pins must face the neighbours it talks to.',
    'A bad floorplan cannot be rescued later. If pins face the wrong side, every one of those nets detours across the block, adding wire delay and congestion for the rest of the flow.',
  ],
  circuit: [
    'Standard cells all have the same height — one row. They sit side by side in rows, sharing power and ground rails along the row edges.',
    'Rows are flipped alternately so neighbouring rows share a VDD rail and a VSS rail. That halves the rail area.',
    'A cell can only be placed on a site: a 0.46 µm grid position in sky130. Placement is discrete, not free-form.',
    'Signals enter and leave through pins on the core boundary. Pin position decides how far the outside signal must travel before it reaches logic.',
  ],
  topic: [
    'Die area = the physical box you are given. Core area = die minus the margin ring used for IO, power rings and decap.',
    'Utilisation = placed cell area ÷ usable core area. Usable core excludes macro area and halos.',
    'Aspect ratio = core height ÷ core width. A square core minimises average wirelength; a tall thin core forces long vertical detours.',
    'Rows are created with make_rows. Pins are placed with place_pins, ideally spread and aligned to the routing layer direction.',
  ],
  keys: [
    'Core area = cell area / utilisation, then split by aspect ratio.',
    'Alternating flipped rows share power rails — that is why row orientation matters.',
    'Pin side must match the neighbouring block, not convenience.',
    'Leave core margin for the power ring; 5–15 µm is typical at block level.',
  ],
  commands: [
    { label: 'OpenROAD floorplan', code: 'initialize_floorplan -utilization 60 \\\n  -aspect_ratio 1.0 -core_space {10 10 10 10} \\\n  -site unithd\nmake_tracks' },
    { label: 'rows + pins', code: 'make_rows\nplace_pins -hor_layers met3 -ver_layers met2 \\\n  -random -min_distance 2\nwrite_def floorplan/floorplan.def' },
    { label: 'check it', code: 'report_design_area\nreport_utilization\ncheck_placement -verbose' },
  ],
  failures: [
    { symptom: 'Utilisation reports 95% after floorplan', cause: 'Macro area not excluded from usable core.', fix: 'Recompute with macro area + halo subtracted, or lower the target utilisation.' },
    { symptom: 'Pins overlap / cannot be placed', cause: 'Too many pins for the chosen layer pitch and edge length.', fix: 'Spread across more edges or use a higher metal layer with coarser pitch.' },
    { symptom: 'Long detours on boundary nets', cause: 'Pins on the wrong side relative to the neighbour.', fix: 'Get the top-level pin contract and re-place pins to match it.' },
  ],
  interview: [
    {
      q: 'How do you decide the core size?',
      a: 'Take the cell area from synthesis, add margin for clock tree, buffers and decap, then divide by the target utilisation. That gives usable core area. Add macro area and halos, then split into width and height using the aspect ratio the top level allows, and add the core-to-die margin for the power ring.',
      followups: [
        { q: 'Why not 100% utilisation?', a: 'Cells need whitespace to legalise, and later stages insert clock buffers, hold buffers, decap and filler. At 100% there is nowhere to put them and routing has no room.' },
        { q: 'Why is aspect ratio 1 preferred?', a: 'A square minimises the average distance between any two points. Long thin cores force detours, which means more wire, more delay and more congestion.' },
      ],
    },
    {
      q: 'Why are alternate rows flipped?',
      a: 'Each row has VDD on one edge and VSS on the other. Flipping every second row lets two rows share one rail instead of each having its own. It saves area and gives a continuous power rail across the core.',
      followups: [
        { q: 'What is a placement site?', a: 'The smallest legal horizontal step, 0.46 µm in sky130_hd. Every cell width is an integer number of sites, so cells snap to that grid.' },
      ],
    },
  ],
  quiz: [
    { q: 'Utilisation is defined as:', options: ['core area / die area', 'cell area / usable core area', 'macro area / core area', 'routed nets / total nets'], answer: 1, why: 'It measures how full the placeable core is with standard cells.' },
    { q: 'Alternate rows are flipped mainly to:', options: ['Reduce clock skew', 'Share power rails', 'Improve DRC', 'Allow taller cells'], answer: 1, why: 'Flipped rows share VDD/VSS rails, saving area.' },
    { q: 'A tall thin core (aspect 2.5) usually causes:', options: ['Shorter wires', 'More vertical detour and congestion', 'Lower leakage', 'Fewer DRCs'], answer: 1, why: 'Non-square shapes increase average Manhattan distance between cells.' },
  ],
};