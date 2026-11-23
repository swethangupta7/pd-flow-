export default {
  id: 'signoff',
  n: 9,
  name: 'Signoff & GDSII',
  short: 'GDS',
  tool: 'Magic / Netgen / KLayout',
  color: '#dbe4f5',
  dir: 'outputs/ + db/',
  inputs: ['final.odb', 'routed.def', 'tech rule deck', 'netlist.v'],
  outputs: ['design.gds', 'drc.rpt', 'lvs.rpt', 'final.spef', 'tapeout checklist'],
  summary: 'Prove the layout is manufacturable and matches the schematic. Then export GDSII.',
  realWork: [
    'Signoff is a set of independent proofs, not a feeling. DRC says the foundry can build it. LVS says you built the circuit you designed. Antenna says the gates survived processing. ERC says no floating wells or shorted supplies.',
    'Every report must be clean or have a signed waiver. "It is only two errors" is not a status anyone accepts at tapeout.',
    'This is the deliverable: a GDSII file plus a report pack. Miss one check and the mask set is wrong — there is no undo.',
  ],
  circuit: [
    'Filler cells close the gaps between logic cells so the n-well and implant layers stay continuous. Without them you get well-spacing and implant DRC errors.',
    'Decap cells add gate capacitance between VDD and VSS, acting as local charge reservoirs for switching spikes.',
    'Tap cells connect the wells to the supplies at required intervals, preventing latch-up — a parasitic thyristor that can short VDD to VSS and destroy the part.',
    'LVS extracts devices and connections from the actual polygons and compares that netlist to the schematic. A single missing via can show up as an open net.',
  ],
  topic: [
    'DRC: spacing, width, enclosure, min-area, density rules from the foundry deck. Run in Magic or a commercial checker.',
    'LVS: layout-extracted netlist vs source netlist. Devices, sizes and connectivity must match. Netgen does the comparison.',
    'Antenna: metal-area to gate-area ratios per layer, fixed with diodes or layer jumps.',
    'Metal density fill: the foundry requires uniform metal density for CMP. Fill is added last and re-extracted because it changes coupling capacitance.',
    'Final timing is re-run with fill-aware SPEF. Then GDSII is streamed out and viewed in KLayout as a last human check.',
  ],
  keys: [
    'DRC = can it be built. LVS = is it the right circuit. Both must be clean.',
    'Filler, decap and tap cells are reliability structures, not optional decoration.',
    'Metal fill changes parasitics — re-extract and re-time after fill.',
    'The tapeout pack is GDS + reports + waivers. Nothing ships on a verbal "looks fine".',
  ],
  commands: [
    { label: 'finish the layout', code: 'filler_placement -prefix FILL {sky130_fd_sc_hd__fill_1 sky130_fd_sc_hd__fill_2}\nplace_tapcells -distance 14 -tap_cell sky130_fd_sc_hd__tapvpwrvgnd_1\ncheck_placement\nwrite_def outputs/final.def\nwrite_verilog outputs/final.v' },
    { label: 'stream out + DRC (Magic)', code: 'gds write outputs/design.gds\n# magic -T sky130A -noconsole\n#   gds read outputs/design.gds\n#   drc check\n#   drc catchup\n#   drc count total' },
    { label: 'LVS (Netgen) + view', code: 'netgen -batch lvs "outputs/design.spice design" \\\n  "outputs/final.v design" sky130A_setup.tcl comp.out\nklayout outputs/design.gds' },
  ],
  failures: [
    { symptom: 'Well / implant spacing DRC across the core', cause: 'Missing filler cells between logic cells.', fix: 'Run filler_placement to close every gap, then re-check.' },
    { symptom: 'LVS reports open nets', cause: 'Missing vias between the mesh and rails, or unconnected power pins.', fix: 'Check pdn connectivity and global connections; re-run pdngen and re-extract.' },
    { symptom: 'Timing degrades after metal fill', cause: 'Fill adds coupling capacitance to signal nets.', fix: 'Re-extract with fill-aware rules and re-close the affected paths.' },
  ],
  interview: [
    {
      q: 'What is the difference between DRC and LVS?',
      a: 'DRC checks manufacturability: do the shapes obey the foundry geometry rules — spacing, width, enclosure, density. LVS checks correctness: does the netlist extracted from the layout match the schematic netlist, device by device and net by net. A layout can pass DRC and still be the wrong circuit, which is why you need both.',
      followups: [
        { q: 'Why are filler cells needed?', a: 'They keep the well and implant layers continuous between logic cells. Without them the well spacing rules fail, and the wells can float.' },
        { q: 'What are tap cells for?', a: 'They tie the n-well and substrate to the supplies at required intervals. That prevents latch-up, where a parasitic PNPN structure turns on and shorts VDD to VSS.' },
        { q: 'Why re-time after fill?', a: 'Metal fill adds capacitance to nearby signal nets. Timing that was clean before fill can fail after it, so extraction and analysis are repeated.' },
      ],
    },
    {
      q: 'What is in a tapeout package?',
      a: 'The GDSII, the final netlist, the final SPEF, and a report pack: DRC, LVS, antenna, ERC, density, IR/EM, and timing across all corners. Every violation is either fixed or has an approved waiver. Nothing is left as an assumption.',
      followups: [
        { q: 'What is a metal ECO?', a: 'A fix using only metal-layer changes on pre-placed spare cells, so the base-layer masks are reused. It is much cheaper than a full mask respin.' },
      ],
    },
  ],
  quiz: [
    { q: 'LVS compares:', options: ['Layout geometry to rules', 'Layout netlist to schematic netlist', 'Two timing corners', 'GDS to DEF'], answer: 1, why: 'It proves the built circuit matches the designed circuit.' },
    { q: 'Tap cells prevent:', options: ['Crosstalk', 'Latch-up', 'Antenna effect', 'Clock skew'], answer: 1, why: 'They tie wells to supplies, stopping the parasitic thyristor from turning on.' },
    { q: 'After metal fill you must:', options: ['Nothing, fill is inert', 'Re-extract and re-time', 'Re-run synthesis', 'Delete the clock tree'], answer: 1, why: 'Fill changes coupling capacitance, so timing must be re-verified.' },
  ],
};