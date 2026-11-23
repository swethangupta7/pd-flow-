export default {
  id: 'sta',
  n: 8,
  name: 'Timing Closure & ECO',
  short: 'STA',
  tool: 'OpenSTA / OpenROAD (rsz)',
  color: '#fb7185',
  dir: 'eco/ + mmmc/',
  inputs: ['routed.odb', 'parasitics.spef', 'mmmc.tcl', 'slow.lib', 'fast.lib'],
  outputs: ['setup.rpt', 'hold.rpt', 'eco.tcl', 'final.odb'],
  summary: 'Close setup and hold across corners, then patch what is left with small, surgical ECOs.',
  realWork: [
    'You analyse at multiple corners and modes at once — MMMC. Setup at the slow corner, hold at the fast corner, both with real parasitics and propagated clocks.',
    'You fix the worst paths first, and you fix them with the smallest change that works. A big re-place at this stage destroys hours of routing.',
    'The deliverable is zero setup violations, zero hold violations, clean slew and capacitance, across every corner the signoff team requires.',
  ],
  circuit: [
    'Setup: data launched by one clock edge must reach the capture flop before the next edge minus setup time. Slack = required time − arrival time. Negative means the data is late.',
    'Hold: after the capture edge, the data must stay stable for the hold time. If the next value races through a short path and arrives too soon, it overwrites the value being captured. Slack = arrival − required.',
    'Setup failure means the chip is too slow — you can often rescue it by lowering frequency. Hold failure means the chip is wrong at any frequency. That is why hold is more dangerous.',
    'Temperature and voltage change transistor drive. At high temperature and low voltage, cells are slow: worst for setup. At low temperature and high voltage, cells are fast: worst for hold. (In advanced nodes temperature inversion can flip this — always check the library.)',
  ],
  topic: [
    'Setup fix toolkit: resize to stronger cells, buffer long nets, move cells closer, use lower-Vt cells, useful skew, or pipeline in RTL as a last resort.',
    'Hold fix toolkit: insert delay buffers on the short path, or downsize. Hold fixing must be done at the fast corner and re-checked at slow.',
    'Multi-Vt: LVT is fast and leaky, HVT is slow and quiet. You sprinkle LVT only on critical paths and leave HVT everywhere else.',
    'ECO (engineering change order) is a late, minimal edit: swap a cell, insert a buffer, reconnect a net — without re-running the whole flow.',
    'Also check max transition, max capacitance and max fanout. A path can meet slack and still be unreliable because of a slow edge.',
  ],
  keys: [
    'Setup = too slow, fixable by frequency. Hold = wrong at any frequency.',
    'Setup at slow corner, hold at fast corner. Both with SPEF and propagated clocks.',
    'LVT buys speed and costs leakage. Use it only where slack demands it.',
    'ECOs are surgical: small change, re-extract, re-check. Never a full re-run.',
  ],
  commands: [
    { label: 'MMMC analysis', code: 'read_spef route/parasitics.spef\nset_propagated_clock [all_clocks]\nreport_checks -path_delay max -corner slow -slack_max 0\nreport_checks -path_delay min -corner fast -slack_max 0\nreport_check_types -max_slew -max_capacitance -max_fanout -violators' },
    { label: 'setup repair', code: 'repair_design -max_wire_length 200\nrepair_timing -setup -slack_margin 0.05 \\\n  -lib_cell sky130_fd_sc_hd__buf_4\ndetailed_placement' },
    { label: 'hold repair + ECO', code: 'repair_timing -hold -hold_margin 0.03 \\\n  -lib_cell sky130_fd_sc_hd__dlygate4sd3_1\n# manual ECO:\nreplace_cell -instance u_crit_12 -lib_cell sky130_fd_sc_hd__and2_4\nwrite_changes eco/eco.tcl' },
  ],
  failures: [
    { symptom: 'Setup fixed but hold now fails', cause: 'Speeding up a path also speeds the short path into the same flop.', fix: 'Always re-check hold after every setup fix, at the fast corner.' },
    { symptom: 'Leakage power doubled after timing repair', cause: 'Too many LVT swaps applied globally.', fix: 'Restrict LVT to paths with negative slack; recover the rest to HVT.' },
    { symptom: 'Slack clean but max_slew violations remain', cause: 'Weak drivers on long or high-fanout nets.', fix: 'Buffer or upsize. Slow edges cause noise sensitivity and unreliable sampling.' },
  ],
  interview: [
    {
      q: 'Why is hold more dangerous than setup?',
      a: 'A setup failure means the path is too slow for the chosen frequency. You can lower the frequency and the chip still works. A hold failure means data races through and corrupts the captured value — it is wrong at every frequency, including DC. There is no knob to turn. You must fix it in silicon geometry before tapeout.',
      followups: [
        { q: 'Setup and hold corners?', a: 'Setup at slow process, high temperature, low voltage — maximum delay. Hold at fast process, low temperature, high voltage — minimum delay. Watch for temperature inversion in advanced nodes.' },
        { q: 'What exactly is slack?', a: 'Setup slack = required arrival − actual arrival. Hold slack = actual arrival − required minimum. Positive is passing in both cases; the formulas differ because the checks point in opposite directions.' },
        { q: 'How does useful skew help setup?', a: 'Delay the capture clock so the data gets more time. But that same delay reduces hold margin on paths leaving that flop, so you must verify hold afterwards.' },
      ],
    },
    {
      q: 'What is an ECO and when do you use it?',
      a: 'A late minimal change to the netlist or layout — a cell swap, a buffer insertion, a reconnect — used after routing when a full re-run would cost too much time and would disturb a converged design. You apply it, re-extract the affected nets, and re-run timing and DRC on the change.',
      followups: [
        { q: 'Functional vs timing ECO?', a: 'Timing ECO changes drive strength or delay without changing logic. Functional ECO changes the logic itself, usually using spare cells placed for exactly this purpose.' },
        { q: 'Why keep spare cells?', a: 'So a functional fix after tapeout can be done by changing only metal layers, which is far cheaper than a full mask set.' },
      ],
    },
  ],
  quiz: [
    { q: 'A hold violation means:', options: ['The chip runs slower than target', 'The chip is wrong at any frequency', 'Only the slow corner fails', 'The clock is too fast'], answer: 1, why: 'Data corrupts the captured value regardless of clock period.' },
    { q: 'Hold analysis uses which corner?', options: ['Slow / hot / low V', 'Fast / cold / high V', 'Typical', 'Same as setup'], answer: 1, why: 'Minimum delay is the worst case for hold.' },
    { q: 'LVT cells are used sparingly because:', options: ['They are large', 'They leak more static power', 'They are slow', 'They cannot drive loads'], answer: 1, why: 'Low threshold speeds switching but raises subthreshold leakage.' },
  ],
};