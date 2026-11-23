// sky130A / sky130_fd_sc_hd reference data + the lab's colour system.
// Site and layer numbers are the real sky130 high-density values.

export const PDK = {
  name: 'sky130A',
  lib: 'sky130_fd_sc_hd',
  corner: 'tt_025C_1v80',
  siteW: 0.46,      // um — one placement site width
  siteH: 2.72,      // um — one standard-cell row height
  voltage: 1.8,
  maxMetal: 5,      // met1 .. met5 usable for signal routing
  cellAreaAvg: 6.4, // um^2 average placed std cell
};

export const PALETTE = {
  bg: '#070b16',
  bg2: '#0b1224',
  surface: '#111a30',
  surface2: '#16223c',
  line: '#243453',
  ink: '#e8eefc',
  ink2: '#9fb0d0',
  ink3: '#6b7ea3',
  cyan: '#22d3ee',
  acid: '#a3e635',
  amber: '#f5a524',
  magenta: '#ff4d9d',
  clock: '#f0e14a',
  emerald: '#34d399',
  rose: '#fb7185',
  red: '#ff3b30',
  copper: '#e07a3f',
  steel: '#7dd3fc',
  platinum: '#dbe4f5',
};

// metal stack: colour + dash pattern + label so layers stay separable
// for colour-blind viewers, not by hue alone.
export const METALS = [
  { id: 'li1',  name: 'li1',  color: '#94a3b8', dash: [],      dir: 'local', pitch: 0.34 },
  { id: 'met1', name: 'met1', color: '#22d3ee', dash: [],      dir: 'H',     pitch: 0.34 },
  { id: 'met2', name: 'met2', color: '#a3e635', dash: [7, 3],  dir: 'V',     pitch: 0.46 },
  { id: 'met3', name: 'met3', color: '#f5a524', dash: [12, 4], dir: 'H',     pitch: 0.68 },
  { id: 'met4', name: 'met4', color: '#ff4d9d', dash: [3, 3],  dir: 'V',     pitch: 0.92 },
  { id: 'met5', name: 'met5', color: '#60a5fa', dash: [16, 5], dir: 'H',     pitch: 1.60 },
];

export const DESIGNS = [
  {
    id: 'picorv32',
    name: 'picorv32',
    tag: 'RISC-V RV32IMC core',
    cells: 11842,
    flops: 1613,
    macros: 0,
    ios: 268,
    depth: 34,
    clock: 10.0,
    note: 'The classic open-source teaching core. Small enough to close in minutes, real enough to show every PD problem.',
    rtl: 'picorv32.v',
  },
  {
    id: 'spm',
    name: 'spm',
    tag: '32-bit serial-parallel multiplier',
    cells: 1204,
    flops: 96,
    macros: 0,
    ios: 68,
    depth: 22,
    clock: 8.0,
    note: 'Tiny first-run design. Use it to see the whole flow end to end before touching a big block.',
    rtl: 'spm.v',
  },
  {
    id: 'aes_cipher',
    name: 'aes_cipher_core',
    tag: 'AES-128 encrypt datapath',
    cells: 24610,
    flops: 2140,
    macros: 0,
    ios: 394,
    depth: 46,
    clock: 6.5,
    note: 'Wide combinational cones. Congestion and setup timing bite here — good for practising utilisation trade-offs.',
    rtl: 'aes_cipher_top.v',
  },
  {
    id: 'uart_fifo',
    name: 'uart_axis_fifo',
    tag: 'UART + AXI-Stream FIFO',
    cells: 3980,
    flops: 512,
    macros: 1,
    ios: 142,
    depth: 26,
    clock: 12.0,
    note: 'One SRAM macro. Learn macro placement, halos and the pin-access problem without a big floorplan.',
    rtl: 'uart_axis_fifo.v',
  },
  {
    id: 'soc_wrapper',
    name: 'soc_core_wrapper',
    tag: 'Core + 4 SRAM + peripherals',
    cells: 46320,
    flops: 5880,
    macros: 4,
    ios: 612,
    depth: 52,
    clock: 5.0,
    note: 'Block-level reality: macros, channels, power mesh, clock tree with real skew. This is the 5-year-experience sandbox.',
    rtl: 'soc_core_wrapper.v',
  },
];

export const LAYERS = [
  { id: 'core',    label: 'Die / core',      color: '#7dd3fc', hint: 'die boundary, core box, placement rows' },
  { id: 'macros',  label: 'Macros / SRAM',   color: '#c4b5fd', hint: 'hard blocks and their halos' },
  { id: 'cells',   label: 'Standard cells',  color: '#a3e635', hint: 'placed logic, coloured by cell class' },
  { id: 'power',   label: 'Power grid',      color: '#e07a3f', hint: 'rings, straps, rails, vias' },
  { id: 'clock',   label: 'Clock tree',      color: '#f0e14a', hint: 'root, buffers, leaves, skew' },
  { id: 'routes',  label: 'Signal routes',   color: '#22d3ee', hint: 'met1..met5 wire segments' },
  { id: 'pins',    label: 'IO pins',         color: '#ff4d9d', hint: 'block boundary pin locations' },
  { id: 'viol',    label: 'Violations',      color: '#ff3b30', hint: 'DRC markers and failing endpoints' },
];

export const OVERLAYS = [
  { id: 'none',       label: 'None',          hint: 'plain layout view' },
  { id: 'congestion', label: 'Congestion',    hint: 'routing demand vs supply per tile' },
  { id: 'timing',     label: 'Setup slack',   hint: 'endpoint slack, red = failing' },
  { id: 'ir',         label: 'IR drop',       hint: 'voltage drop across the power mesh' },
  { id: 'skew',       label: 'Clock arrival', hint: 'clock latency reaching each flop' },
];

export const CELL_CLASSES = [
  { id: 'comb', label: 'Combinational', color: '#4ade80', share: 0.52 },
  { id: 'seq',  label: 'Flip-flop',     color: '#22d3ee', share: 0.16 },
  { id: 'buf',  label: 'Buffer / inv',  color: '#f5a524', share: 0.14 },
  { id: 'clk',  label: 'Clock buffer',  color: '#f0e14a', share: 0.05 },
  { id: 'tie',  label: 'Tie / filler',  color: '#64748b', share: 0.09 },
  { id: 'decap',label: 'Decap',         color: '#e07a3f', share: 0.04 },
];

export const TOOLCHAIN = [
  {
    name: 'Yosys',
    role: 'RTL synthesis',
    stages: ['rtl', 'synth'],
    color: '#22d3ee',
    what: 'Reads Verilog, turns it into gates, maps those gates to the sky130 standard-cell library.',
    cmd: 'sudo apt install yosys      # or: brew install yosys',
    url: 'https://github.com/YosysHQ/yosys',
  },
  {
    name: 'OpenROAD',
    role: 'Floorplan → route',
    stages: ['floorplan', 'powerplan', 'place', 'cts', 'route'],
    color: '#a3e635',
    what: 'The open-source physical design engine. Floorplan, power grid, placement, CTS, global + detailed routing.',
    cmd: 'git clone --recursive https://github.com/The-OpenROAD-Project/OpenROAD',
    url: 'https://github.com/The-OpenROAD-Project/OpenROAD',
  },
  {
    name: 'OpenSTA',
    role: 'Static timing analysis',
    stages: ['sta'],
    color: '#fb7185',
    what: 'Reads netlist + parasitics + SDC, reports setup and hold slack per path. Bundled inside OpenROAD as the `sta` shell.',
    cmd: 'git clone https://github.com/The-OpenROAD-Project/OpenSTA',
    url: 'https://github.com/The-OpenROAD-Project/OpenSTA',
  },
  {
    name: 'Magic',
    role: 'DRC + extraction',
    stages: ['signoff'],
    color: '#f5a524',
    what: 'Layout editor and design-rule checker. Reads GDS, runs the foundry rule deck, extracts parasitics.',
    cmd: 'sudo apt install magic',
    url: 'https://github.com/RTimothyEdwards/magic',
  },
  {
    name: 'Netgen',
    role: 'LVS',
    stages: ['signoff'],
    color: '#ff4d9d',
    what: 'Compares the layout netlist against the schematic netlist. Proves you built the circuit you designed.',
    cmd: 'sudo apt install netgen-lvs',
    url: 'https://github.com/RTimothyEdwards/netgen',
  },
  {
    name: 'KLayout',
    role: 'GDS viewer',
    stages: ['signoff'],
    color: '#34d399',
    what: 'Fast GDS/OASIS viewer. What you actually stare at when checking the final layout by eye.',
    cmd: 'sudo apt install klayout',
    url: 'https://www.klayout.de/',
  },
  {
    name: 'OpenLane 2',
    role: 'Full flow runner',
    stages: ['rtl', 'synth', 'floorplan', 'powerplan', 'place', 'cts', 'route', 'sta', 'signoff'],
    color: '#dbe4f5',
    what: 'Wraps all of the above into one RTL-to-GDSII flow with a config file. This lab mirrors its step order.',
    cmd: 'pip install openlane',
    url: 'https://github.com/efabless/openlane2',
  },
];

export const PDK_NOTE =
  'Everything here is modelled on sky130A with the sky130_fd_sc_hd library: 0.46 µm site width, 2.72 µm row height, five signal metal layers. Get the PDK with `pip install volare && volare enable --pdk sky130 <version>` or via the open_pdks build.';