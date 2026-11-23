export default {
  id: 'powerplan',
  n: 4,
  name: 'Macros & Powerplan',
  short: 'PG',
  tool: 'OpenROAD (mpl / pdn)',
  color: '#e07a3f',
  dir: 'floorplan/ + macros/',
  inputs: ['floorplan.odb', 'macro.lef', 'pdn.cfg'],
  outputs: ['macro_placement.cfg', 'powerplan.odb', 'pdn.log'],
  summary: 'Place hard macros with halos, then build rings, straps and rails that feed every cell.',
  realWork: [
    'Macros go first because they are huge and immovable. You place them by connectivity and by pin direction, then you never move them again without re-running everything.',
    'Then you build the power grid. This is a reliability deliverable, not a decoration: IR drop and electromigration are signoff gates that can fail a chip that otherwise works.',
    'The company cares because a power-grid failure is a silicon failure. You cannot patch it with an ECO after tapeout.',
  ],
  circuit: [
    'Current flows from the pads or bumps into a ring, down vertical and horizontal straps forming a mesh, through via arrays into the horizontal rails that run along each row, and into each cell.',
    'Every segment has resistance. Current through resistance drops voltage: V = I × R. A cell at the far end of a thin strap sees less than 1.8 V.',
    'Lower voltage means weaker transistor drive, which means slower charging of the next gate. That is why IR drop shows up as setup failure.',
    'A macro draws a large current in a small area, so the mesh must be denser around it. Macro halos also keep standard cells out of the pin-access region.',
  ],
  topic: [
    'Hierarchy: pads/bumps → core ring → straps (mesh) → via arrays → row rails → cell power pins.',
    'Strap pitch and width set the resistance. Wider and closer straps mean lower IR drop but consume routing tracks on those layers.',
    'That is the real trade: power grid versus signal routing resource. Met4/met5 are usually the mesh, leaving met1–met3 for signals.',
    'Decap cells sit between rails and act as local charge reservoirs, supplying the fast current spikes that the distant pad cannot deliver in time.',
    'Electromigration is a current-density limit: too much current in a thin wire moves metal atoms and eventually opens the wire. DC power nets are the main EM risk.',
  ],
  keys: [
    'IR drop budget is typically 5–10% of VDD; static and dynamic are checked separately.',
    'Macro halo (e.g. 5–10 µm) keeps cells away so macro pins stay accessible.',
    'Denser mesh lowers IR drop but steals routing tracks — watch congestion after PDN.',
    'Decap fixes dynamic droop; wider straps fix static drop. Different problems.',
  ],
  commands: [
    { label: 'macro placement', code: 'place_macro -macro_name sram_0 -location {20 20} -orientation R0\nset_macro_halo -macro sram_0 -halo {8 8 8 8}\n# or automatic:\nrtl_macro_placer -halo_width 8 -channel_width 12' },
    { label: 'power grid (pdngen)', code: 'add_global_connection -net VDD -pin_pattern "^VPWR$" -power\nadd_global_connection -net VSS -pin_pattern "^VGND$" -ground\nset_voltage_domain -name CORE -power VDD -ground VSS\ndefine_pdn_grid -name core -voltage_domains CORE\nadd_pdn_ring   -grid core -layers {met4 met5} -widths 8 -spacings 2 -core_offsets 4\nadd_pdn_stripe -grid core -layer met4 -width 4 -pitch 40 -offset 10\nadd_pdn_stripe -grid core -layer met5 -width 4 -pitch 40 -offset 10\nadd_pdn_stripe -grid core -layer met1 -width 0.48 -followpins\nadd_pdn_connect -grid core -layers {met1 met4}\nadd_pdn_connect -grid core -layers {met4 met5}\npdngen' },
    { label: 'IR check', code: 'analyze_power_grid -net VDD\nreport_power_grid -net VDD\nreport_voltage_drop -threshold 0.09' },
  ],
  failures: [
    { symptom: 'Macro pins unreachable, huge DRC cluster at macro edge', cause: 'No halo, cells placed right against macro pins.', fix: 'Add a halo and re-run placement; check pin access on the correct metal layer.' },
    { symptom: 'IR drop 15% in the core centre', cause: 'Strap pitch too wide, or mesh too far from the current hotspot.', fix: 'Reduce pitch, widen straps, add via arrays, and add decap near the hotspot.' },
    { symptom: 'Congestion jumps after PDN', cause: 'Mesh consumed too many tracks on signal layers.', fix: 'Move the mesh up to met4/met5 and keep met1–met3 for signals.' },
  ],
  interview: [
    {
      q: 'Explain the power grid hierarchy.',
      a: 'Pads or bumps at the top bring current in. A ring around the core distributes it. Straps on the upper metals form a mesh across the core. Via arrays drop that mesh down to the row rails on met1, and each cell taps the rail. Every level has resistance, so voltage falls as you go down and out toward the far cells.',
      followups: [
        { q: 'Static vs dynamic IR drop?', a: 'Static is the average-current drop — fixed by wider straps and denser mesh. Dynamic is the fast switching spike — the pad is too far away to respond in time, so local decap supplies the charge.' },
        { q: 'How does IR drop cause a setup violation?', a: 'Lower VDD reduces transistor drive current. Gates charge their load more slowly, path delay grows, and slack shrinks. It is a timing problem caused by a power problem.' },
        { q: 'What is electromigration?', a: 'High current density physically moves metal atoms, creating voids and opens over time. It is a lifetime reliability limit, mostly on DC power nets. You fix it by widening wires and adding parallel vias.' },
      ],
    },
    {
      q: 'Why do macros need a halo?',
      a: 'Macro pins sit on its edges, usually on met3/met4. If standard cells are placed right against the edge, the router cannot get to those pins and you get a DRC pile-up. The halo reserves that access region, and also gives room for the macro power connection.',
      followups: [
        { q: 'How do you choose macro orientation?', a: 'Face the macro pins toward the logic that talks to them, and keep power pins aligned with the mesh. Orientation is decided by connectivity, not by looks.' },
      ],
    },
  ],
  quiz: [
    { q: 'Dynamic IR drop is best reduced by:', options: ['Wider straps only', 'Local decap cells near the hotspot', 'Higher utilisation', 'Fewer clock buffers'], answer: 1, why: 'Decap supplies fast local charge that the distant pad cannot deliver in time.' },
    { q: 'IR drop hurts setup timing because:', options: ['It increases clock skew only', 'Lower VDD slows gate charging', 'It adds DRCs', 'It shortens the clock period'], answer: 1, why: 'Reduced supply lowers drive current, so path delay grows.' },
    { q: 'A macro halo exists to:', options: ['Save power', 'Keep macro pins accessible for routing', 'Reduce leakage', 'Increase utilisation'], answer: 1, why: 'It reserves the pin-access region around the hard block.' },
  ],
};