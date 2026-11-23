export default {
  id: 'cts',
  n: 6,
  name: 'Clock Tree Synthesis',
  short: 'CTS',
  tool: 'OpenROAD (cts)',
  color: '#f0e14a',
  dir: 'cts/',
  inputs: ['placed.odb', 'base.sdc', 'clock_cell_list'],
  outputs: ['cts.odb', 'clock_tree.rpt', 'skew.rpt'],
  summary: 'Build the real clock network. Skew and insertion delay stop being assumptions.',
  realWork: [
    'Before CTS the clock is ideal: it arrives everywhere at time zero. After CTS it is a real tree of buffers with real delay, and every flop sees a slightly different arrival time.',
    'You now re-run timing with propagated clocks and reduce clock uncertainty to jitter only. This is the moment many blocks first show hold violations.',
    'The deliverable is a balanced tree: skew inside target, insertion delay reasonable, transition times clean, and no hold catastrophe.',
  ],
  circuit: [
    'The clock pin of every flop is a load. Thousands of flops on one net is an enormous capacitance — no single buffer can drive it with a sharp edge.',
    'So you build a tree: root buffer, then levels of buffers, each fanning out to a manageable number of children, ending at the flop clock pins.',
    'Each buffer adds delay. Insertion delay (latency) is root-to-leaf time. Skew is the difference in arrival between two leaves.',
    'Setup: if the capture flop\'s clock arrives later than the launch flop\'s, you gain time. Hold: that same skew steals time from the short path. Positive skew helps setup and hurts hold.',
    'A slow clock edge (bad transition) makes the flop\'s internal sampling ambiguous and increases both setup and hold sensitivity. Sharp edges matter.',
  ],
  topic: [
    'CTS balances the tree by inserting buffers and, where needed, adding delay to fast branches so all leaves arrive together.',
    'Targets: max skew, max insertion delay, max transition, max fanout per buffer.',
    'More buffer levels give finer balance (lower skew) but higher latency, more clock power, and more cells to route around.',
    'Clock nets are usually routed with wider wires and shielding on higher metals, and often with NDRs (non-default rules) to protect edge quality.',
    'Useful skew is deliberate imbalance: give a late capture clock to a critical setup path. It is a timing tool, but it must not create hold failures.',
  ],
  keys: [
    'Skew helps setup and hurts hold when the capture clock is late.',
    'Post-CTS: switch to propagated clocks and drop uncertainty to jitter only.',
    'Clock power is a large share of dynamic power — every buffer switches every cycle.',
    'Hold violations appear here because real skew finally exists.',
  ],
  commands: [
    { label: 'run CTS', code: 'set_propagated_clock [all_clocks]\nclock_tree_synthesis -root_buf sky130_fd_sc_hd__clkbuf_8 \\\n  -buf_list {sky130_fd_sc_hd__clkbuf_4 sky130_fd_sc_hd__clkbuf_8 sky130_fd_sc_hd__clkbuf_16} \\\n  -sink_clustering_enable -sink_clustering_size 20 \\\n  -max_skew 0.15\ndetailed_placement' },
    { label: 'report the tree', code: 'report_cts\nreport_clock_skew\nreport_clock_latency\nreport_checks -path_delay min -format full_clock_expanded' },
    { label: 'post-CTS uncertainty', code: 'set_clock_uncertainty 0.05 [get_clocks core_clk]  ;# jitter only\nreport_checks -path_delay max\nreport_checks -path_delay min' },
  ],
  failures: [
    { symptom: 'Skew far above target', cause: 'Unbalanced sink distribution, or macros splitting the tree.', fix: 'Enable sink clustering, allow more buffer levels, and check for placement blockages splitting clock regions.' },
    { symptom: 'Hold violations explode after CTS', cause: 'Real skew now exists on short paths.', fix: 'This is expected. Run hold fixing (insert delay buffers) after CTS, at the fast corner.' },
    { symptom: 'Clock transition violations', cause: 'Too much fanout per buffer or thin clock wires.', fix: 'Lower max fanout, use stronger buffers, and apply a wider-wire NDR to clock nets.' },
  ],
  interview: [
    {
      q: 'What is clock skew and why does it matter?',
      a: 'Skew is the difference in clock arrival time between two flops. If the capture flop gets its clock later, the data has more time to arrive — that helps setup. But the same late capture edge means the next data can overwrite the current value too early on a short path — that hurts hold. So skew is not simply good or bad; it moves time between the two checks.',
      followups: [
        { q: 'Why do hold violations appear only after CTS?', a: 'Before CTS the clock is ideal with zero skew, so short paths look safe. After CTS real skew exists, and a late capture clock on a short path breaks hold.' },
        { q: 'What is useful skew?', a: 'Deliberately giving a later clock to the capture flop of a critical setup path to borrow time. It must be checked against hold at the fast corner, or you trade one failure for another.' },
        { q: 'Insertion delay vs skew?', a: 'Insertion delay is root-to-leaf latency — the same for all leaves ideally. Skew is the difference between leaves. A tree can have large latency and still have tiny skew.' },
      ],
    },
    {
      q: 'Why is clock power so high?',
      a: 'The clock net toggles every cycle, twice, at every buffer and every flop clock pin, whether or not the data changes. Its activity factor is 1 while normal logic is often 0.1. That is why clock gating is the biggest dynamic-power lever.',
      followups: [
        { q: 'What does clock gating do?', a: 'It stops the clock reaching a group of flops when their data is not changing, removing that switching activity. It must be inserted glitch-free, usually with a latch-based gate.' },
      ],
    },
  ],
  quiz: [
    { q: 'A later capture clock (positive skew) generally:', options: ['Helps setup, hurts hold', 'Hurts setup, helps hold', 'Hurts both', 'Helps both'], answer: 0, why: 'More time for data to arrive, less margin before the next data overwrites.' },
    { q: 'Hold violations typically appear first at:', options: ['Synthesis', 'Floorplan', 'After CTS', 'After GDS export'], answer: 2, why: 'Real skew exists only once the clock tree is built.' },
    { q: 'After CTS, clock uncertainty should be:', options: ['Increased', 'Reduced to jitter only', 'Set to zero always', 'Left unchanged'], answer: 1, why: 'Skew is now real and measured, so only jitter remains as uncertainty.' },
  ],
};