export default {
  id: 'synth',
  n: 2,
  name: 'Synthesis',
  short: 'SYN',
  tool: 'Yosys + ABC',
  color: '#22d3ee',
  dir: 'netlist/',
  inputs: ['picorv32.v', 'sky130_fd_sc_hd__tt_025C_1v80.lib', 'base.sdc'],
  outputs: ['picorv32_netlist.v', 'synth.log', 'pre_synth.stats.json'],
  summary: 'Behaviour becomes gates. Cell count, logic depth and the first area number appear.',
  realWork: [
    'You run synthesis, then you read the report before you touch floorplan. Cell count, flop count, combinational area, and the longest logic cone.',
    'If synthesis produced 3x the expected cell count, something is wrong upstream — a memory inferred as flops, a latch inferred by accident, or an unused debug block left in.',
    'The PD engineer cares because synthesis decides your logic depth. Depth is the number of gate stages data crosses. You cannot fix a 60-level cone with placement alone.',
  ],
  circuit: [
    'Each gate is transistors charging and discharging a capacitance. A gate output does not switch instantly — it must charge the wire plus the next gate inputs through a finite transistor current.',
    'More logic levels means more of those charging steps in series. That is your datapath delay.',
    'ABC (the mapper inside Yosys) chooses which library cells implement the logic. A bigger drive cell charges faster but presents a bigger input capacitance to the stage before it.',
    'Mapping is a trade: fewer, stronger stages versus more, weaker stages. The mapper balances that against the timing target you gave it.',
  ],
  topic: [
    'Synthesis is three steps: elaborate RTL into generic logic, optimise that logic, then map it to real library cells.',
    'dfflibmap picks the actual flip-flop cells. abc does the combinational mapping against the liberty timing data.',
    'The output is a gate-level netlist: instances of sky130 cells connected by named nets. No coordinates yet — nothing is placed.',
    'Area at this point is the sum of cell areas. Your floorplan will divide that by target utilisation to get the core box.',
  ],
  keys: [
    'Cell area ÷ utilisation = core area. This is the floorplan starting point.',
    'Logic depth from synthesis is a hard floor on achievable clock period.',
    'Inferred latches and inferred flop-memories are the two classic synthesis surprises.',
    'Scan insertion, if used, happens here and changes flop count and routing.',
  ],
  commands: [
    { label: 'synth.ys', code: 'read_verilog rtl/picorv32.v\nhierarchy -check -top picorv32\nsynth -top picorv32\ndfflibmap -liberty $::env(LIB)\nabc -liberty $::env(LIB) -D 10000\nopt_clean -purge\nwrite_verilog -noattr netlist/picorv32_netlist.v\nstat -liberty $::env(LIB)' },
    { label: 'run it', code: 'yosys -c synth.tcl 2>&1 | tee logs/synth.log\ngrep -A20 "Printing statistics" logs/synth.log' },
    { label: 'area / depth check', code: 'read_liberty $lib\nread_verilog netlist/picorv32_netlist.v\nlink_design picorv32\nreport_design_area\nreport_checks -path_delay max -format full_clock_expanded' },
  ],
  failures: [
    { symptom: 'Cell count explodes vs expectation', cause: 'A memory array inferred as thousands of flops.', fix: 'Instantiate the SRAM macro or use memory_libmap with a real memory library.' },
    { symptom: 'Warning: latch inferred for signal X', cause: 'Incomplete if/case in a combinational always block.', fix: 'Fix the RTL — assign a default. Never let a latch reach PD.' },
    { symptom: 'Huge negative slack already at synthesis', cause: 'Clock target far below what the logic depth supports.', fix: 'Check the deepest cone. Either retime/pipeline the RTL or negotiate the frequency.' },
  ],
  interview: [
    {
      q: 'What exactly does synthesis produce for PD?',
      a: 'A gate-level netlist of real library cells plus a first area and timing estimate. It fixes the logic depth and the cell mix. PD then gives those cells coordinates and wires. Synthesis decides how many stages data crosses; PD decides how long the wires between them are.',
      followups: [
        { q: 'Can PD fix a bad synthesis result?', a: 'Partly. Placement and buffering fix wire delay and drive strength. They cannot remove logic levels. If the cone is too deep, it goes back to RTL for pipelining.' },
        { q: 'What is logic depth?', a: 'The number of gate stages on the longest combinational path between two flops. Each stage adds a charging delay, so depth sets a floor on the clock period.' },
      ],
    },
    {
      q: 'Why is area from synthesis not the final chip area?',
      a: 'Synthesis area is only the cells. The core must also hold whitespace for placement legality, buffers added later, clock tree cells, decap and filler, plus the power grid. That is why you divide by a utilisation target like 0.6, not 1.0.',
      followups: [
        { q: 'What utilisation do you start with?', a: 'Around 55–65% for a block with macros or tight timing, up to 75% for a relaxed logic-only block. You raise it only after routing proves it can close.' },
      ],
    },
  ],
  quiz: [
    { q: 'Cell area is 60,000 µm² and target utilisation is 60%. Core area?', options: ['36,000 µm²', '60,000 µm²', '100,000 µm²', '6,000 µm²'], answer: 2, why: 'Core = cell area / utilisation = 60,000 / 0.6 = 100,000 µm².' },
    { q: 'Which synthesis output most limits the maximum clock frequency?', options: ['Total cell count', 'Longest logic depth', 'Number of IO pins', 'Net names'], answer: 1, why: 'Each logic level adds delay in series; placement cannot remove levels.' },
    { q: 'An inferred latch in the netlist is:', options: ['Fine, PD will buffer it', 'A bug to fix in RTL', 'A memory macro', 'Only a warning, ignore'], answer: 1, why: 'Latches are transparent, hard to time and usually unintended. Fix the RTL.' },
  ],
};