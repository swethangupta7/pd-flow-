export default {
  id: 'rtl',
  n: 1,
  name: 'RTL & Constraints',
  short: 'RTL',
  tool: 'Yosys / OpenSTA',
  color: '#7dd3fc',
  dir: 'rtl/ + sdc/',
  inputs: ['picorv32.v', 'sky130_fd_sc_hd.lef', 'sky130_fd_sc_hd__tt_025C_1v80.lib'],
  outputs: ['design.rtl.v', 'base.sdc'],
  summary: 'Get the design and its timing contract in before any geometry exists.',
  realWork: [
    'On the job you never start with a blank tool. You get a release: RTL from the design team, a liberty file from the library team, LEF from the PDK team, and an SDC from the timing owner.',
    'Your first job is checking the release is complete and consistent. Wrong library corner, missing macro LEF, or an SDC that constrains a clock name that does not exist — these cost a full day later, not five minutes now.',
    'Companies care because every downstream number is measured against this contract. If the clock period in the SDC is wrong, every timing report you produce afterwards is a lie.',
  ],
  circuit: [
    'RTL describes behaviour: on every rising clock edge, these registers capture those values. Between edges, combinational logic computes the next value.',
    'A real path is: flop Q pin → wires and gates → next flop D pin. The clock edge that launched the data and the edge that captures it are one period apart.',
    'The data must arrive before the capture edge minus the flop setup time. That single sentence is the whole reason physical design exists — you are buying time for that journey.',
    'At this stage nothing is placed, so the tool uses wire-load estimates. Treat early timing as a hint, not a verdict.',
  ],
  topic: [
    'The SDC (Synopsys Design Constraints) file is the timing contract. create_clock defines the period and the source pin. set_input_delay and set_output_delay describe what the outside world does at your boundary.',
    'set_false_path removes paths that can never be exercised (async resets, static config). set_multicycle_path allows paths that legitimately take more than one cycle.',
    'A missing constraint is worse than a tight one. An unconstrained path is never optimised and never reported — it silently ships broken.',
    'Read the RTL too. Knowing where the wide muxes, the deep arithmetic and the memory interfaces are tells you where congestion and setup pain will land.',
  ],
  keys: [
    'Clock period sets the budget for every register-to-register path.',
    'Unconstrained ≠ passing. Always run check_timing / report_unconstrained.',
    'Library corner must match the analysis you intend: slow for setup, fast for hold.',
    'Macro LEF must be present before floorplan, or the block has no legal shape.',
  ],
  commands: [
    { label: 'read design (Yosys)', code: 'read_verilog rtl/picorv32.v\nhierarchy -check -top picorv32\nproc; opt; memory -nomap' },
    { label: 'base.sdc', code: 'create_clock -name core_clk -period 10.0 [get_ports clk]\nset_clock_uncertainty 0.25 [get_clocks core_clk]\nset_input_delay  2.0 -clock core_clk [all_inputs]\nset_output_delay 2.0 -clock core_clk [all_outputs]\nset_driving_cell -lib_cell sky130_fd_sc_hd__inv_2 [all_inputs]\nset_load 0.05 [all_outputs]' },
    { label: 'sanity checks (OpenSTA)', code: 'read_liberty $lib\nread_verilog netlist.v\nlink_design picorv32\nread_sdc base.sdc\ncheck_setup -verbose\nreport_checks -unconstrained' },
  ],
  failures: [
    { symptom: 'report_checks says "no paths"', cause: 'Clock not defined on a real port, or design not linked.', fix: 'Check the port name in create_clock, then run link_design and report_clocks.' },
    { symptom: 'Thousands of unconstrained endpoints', cause: 'Generated clocks or IO delays missing.', fix: 'Add create_generated_clock for divided clocks and set_input/output_delay on every boundary port.' },
    { symptom: 'Synthesis cannot find a macro', cause: 'Black-box module with no LEF/lib.', fix: 'Add the macro .lib and .lef to the read list before hierarchy -check.' },
  ],
  interview: [
    {
      q: 'What is an SDC and why does PD need it?',
      a: 'It is the timing contract for the block. It tells the tool the clock period, the clock source, the boundary delays and the exceptions. Every optimisation and every timing report is measured against it. Without it the tool has no target, so it cannot fix anything.',
      followups: [
        { q: 'What happens if a path is unconstrained?', a: 'It is not optimised and not reported. It looks clean but it is unverified. That is why check_timing is a mandatory step, not an optional one.' },
        { q: 'Difference between false path and multicycle path?', a: 'False path: the path can never be exercised, so remove it. Multicycle: the path is real but the logic is allowed more than one cycle, so relax the capture edge by that many cycles.' },
      ],
    },
    {
      q: 'Why do you set clock uncertainty before placement?',
      a: 'Before CTS the clock is ideal — zero skew. Uncertainty reserves margin for the skew and jitter that will exist after the real tree is built. Typical pre-CTS value is jitter plus expected skew. After CTS you reduce it to jitter only, because skew is now real and measured.',
      followups: [
        { q: 'What if you forget to reduce it after CTS?', a: 'You keep pessimism that no longer exists. The tool over-fixes setup, adding area and power for margin you already have.' },
      ],
    },
  ],
  quiz: [
    { q: 'A path shows no slack report at all. Most likely cause?', options: ['It passed with huge margin', 'It is unconstrained', 'It is a hold path', 'The netlist is empty'], answer: 1, why: 'Unconstrained paths are skipped by the analyser. Always run check_timing.' },
    { q: 'Which corner do you use for setup analysis?', options: ['Fast / low temp / high voltage', 'Slow / high temp / low voltage', 'Typical only', 'Any corner, it does not matter'], answer: 1, why: 'Setup needs the worst-case slow delay: slow process, hot, low voltage.' },
    { q: 'set_multicycle_path 2 on a path means:', options: ['The path is deleted', 'Data may take two cycles to be captured', 'The clock is divided by two', 'Hold is ignored'], answer: 1, why: 'It moves the capture edge one extra cycle out, relaxing setup on that path.' },
  ],
};