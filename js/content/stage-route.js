export default {
  id: 'route',
  n: 7,
  name: 'Routing',
  short: 'RT',
  tool: 'OpenROAD (grt / drt)',
  color: '#34d399',
  dir: 'route/',
  inputs: ['cts.odb', 'tech.lef', 'route guides'],
  outputs: ['routed.odb', 'routed.def', 'drc.rpt', 'parasitics.spef'],
  summary: 'Connect every net on real metal. Global guides, then detailed wires, then DRC cleanup.',
  realWork: [
    'Global routing assigns nets to coarse tiles and layers. Detailed routing draws the actual shapes, vias and jogs, obeying every design rule.',
    'You watch two numbers: unrouted nets and DRC count. Both must reach zero. A design with 3 DRCs is not "almost done" — it is not done.',
    'Detailed routing is the longest runtime in the flow. You do not want to re-run it because of a floorplan mistake you could have caught at placement.',
  ],
  circuit: [
    'Each metal layer has a preferred direction — met1 horizontal, met2 vertical, and so on, alternating. Signals change direction by dropping a via to the next layer.',
    'Every via is resistance in series. A path with twelve layer changes has twelve via resistances plus the wire resistance.',
    'Wires on adjacent layers and adjacent tracks couple capacitively. A switching neighbour injects noise and changes the effective delay — that is crosstalk.',
    'Antenna effect: during manufacture a long metal wire connected to a gate collects charge from plasma processing and can punch through the thin gate oxide. A diode or a layer jump bleeds that charge away.',
  ],
  topic: [
    'Global routing (grt) produces guides: rectangles per net per layer, plus a congestion estimate.',
    'Detailed routing (drt) obeys spacing, width, min-area, via rules and end-of-line rules from the tech LEF.',
    'More usable layers means more routing supply — congestion and DRCs fall, but the top layers are usually reserved for the power mesh.',
    'After routing you extract SPEF: real resistance and capacitance per net. This replaces every estimate, and timing becomes believable.',
    'Timing-driven routing prioritises critical nets for short paths and higher, faster layers.',
  ],
  keys: [
    'Zero unrouted nets and zero DRCs — there is no partial credit.',
    'Layer direction alternates; every direction change costs a via.',
    'SPEF extraction after routing is what makes signoff timing real.',
    'Antenna violations are fixed with diodes or layer hopping, not by ignoring them.',
  ],
  commands: [
    { label: 'global route', code: 'global_route -guide_file route/guide.guide \\\n  -congestion_iterations 50 \\\n  -allow_congestion\nglobal_route_debug -nets {net_a net_b}' },
    { label: 'detailed route', code: 'detailed_route -output_drc route/drc.rpt \\\n  -output_maze route/maze.log \\\n  -bottom_routing_layer met1 -top_routing_layer met5 \\\n  -droute_end_iter 64 -verbose 1\ncheck_antennas\nrepair_antennas -diode_cell sky130_fd_sc_hd__diode_2' },
    { label: 'extract + report', code: 'extract_parasitics -ext_model_file rcx_patterns.rules\nwrite_spef route/parasitics.spef\nreport_wire_length\nreport_design_area' },
  ],
  failures: [
    { symptom: 'A few nets stay unrouted after 64 iterations', cause: 'Local congestion or pin access blocked by the power mesh.', fix: 'Add a placement blockage in that region, re-place, or free a track by adjusting the PDN pitch.' },
    { symptom: 'Hundreds of spacing DRCs in one region', cause: 'Congestion above supply — too many nets, too few tracks.', fix: 'Lower density locally, spread pins, or open another routing layer.' },
    { symptom: 'Antenna violations on long nets', cause: 'Large metal area ratio to gate area.', fix: 'Insert antenna diodes or hop the net to a higher layer near the gate.' },
  ],
  interview: [
    {
      q: 'Global vs detailed routing?',
      a: 'Global routing decides which coarse tiles and layers each net passes through — it is a planning step that also measures congestion. Detailed routing draws the real wires and vias inside those guides while obeying every design rule. Global is fast and approximate; detailed is slow and exact.',
      followups: [
        { q: 'Why do layers alternate direction?', a: 'It makes routing predictable and maximises track usage: horizontal on one layer, vertical on the next, connected by vias. It also keeps neighbouring wires from running parallel for long distances, which reduces coupling.' },
        { q: 'What is a SPEF and why does it matter?', a: 'Standard Parasitic Exchange Format — the extracted R and C of every routed net. Before it, timing uses estimates. After it, timing reflects the actual silicon geometry.' },
        { q: 'What is the antenna effect?', a: 'During plasma processing, a long wire connected to a gate collects charge. With nowhere to discharge, the voltage can break down the thin gate oxide. You fix it with a reverse-biased diode to the substrate or by jumping to a higher layer so the charge has a path.' },
      ],
    },
    {
      q: 'How does crosstalk affect timing?',
      a: 'A neighbouring wire switching in the opposite direction increases the effective coupling capacitance the victim must drive, slowing it down. Switching the same way speeds it up. The slow case hurts setup, the fast case can hurt hold. Shielding and spacing reduce it.',
      followups: [
        { q: 'Why is the top metal faster?', a: 'Thicker and wider, so lower resistance, and farther from the substrate, so lower capacitance. Long critical nets and the power mesh go up there.' },
      ],
    },
  ],
  quiz: [
    { q: 'SPEF contains:', options: ['Cell coordinates', 'Extracted resistance and capacitance per net', 'Clock definitions', 'DRC rules'], answer: 1, why: 'It is the parasitic model of the routed wires used for signoff timing.' },
    { q: 'Antenna violations are fixed by:', options: ['Deleting the net', 'Diode insertion or layer hopping', 'Raising utilisation', 'Adding clock buffers'], answer: 1, why: 'Both give the accumulated process charge a discharge path.' },
    { q: 'Opening more routing layers generally:', options: ['Increases DRCs', 'Reduces congestion and DRCs', 'Increases skew', 'Reduces cell count'], answer: 1, why: 'More tracks means more routing supply for the same demand.' },
  ],
};