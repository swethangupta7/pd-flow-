// Questions follow the individual lesson titles. The first choice is the supported answer.
const records = `
A chip and a signal|The sensor changes from 0 to 1. With a good connection, what will the alarm read?|1|0|This example passes the sensor value through to the alarm.
Logic gates and memory|D changes, but the flip-flop has not received a new capture edge. What does Q keep?|Its previously saved value.|The new value immediately.|A flip-flop samples its input at the specified clock edge.
Reading chip maps|With 1000 database units per micrometre, how many micrometres is x = 6000?|6 µm|6000 µm|Divide the database coordinate by the number of units in one micrometre.
Cell master versus cell instance|If u1 changes its input, must u2 change too?|No. It has its own input net.|Yes. It uses the same master.|A master describes the shared behavior. The two copies have independent connections.
Pin mapping|In .S(sel), which name is printed on the cell's socket?|S|sel|The dot introduces the cell pin name. The parentheses hold the design signal.
Nets|What makes u2.A receive u1.Y's value?|Both terminals use net n.|Both instances are next to each other.|Placement and connectivity are separate pieces of information. The shared net joins the terminals.
Fan-out|One output feeds three inputs with different capacitances. What is its fan-out?|3|The sum of their capacitances.|Fan-out counts receiver pins. Total electrical load is a different quantity.
Hierarchy|Where should you look for u_blk/u1?|Inside the u_blk copy.|Beside u_blk at the top level.|Read the path from left to right, entering a block at each slash.
RTL versus netlist|Which line gives the placer a named gate instance?|NAND2_X1 u1 (...);|assign y = ~(a & b);|The first line gives a reusable cell type and a specific copy named u1.
Cell area|Which file tells you whether this cell fits in the remaining row width?|The cell LEF.|Liberty area alone.|Two cells can have the same area and different widths. Use the boundary dimensions.
Cell function|The output rule is !A. What does Y become when A is 0?|1|0|The exclamation mark flips the input.
Input capacitance|Whose job gets harder when pin A has more capacitance?|The gate driving A.|Only the gate that owns A.|The upstream driver has to move extra charge into or out of the input.
Propagation delay|A crosses at 20 ps and Y crosses at 52 ps. What is the delay?|32 ps|52 ps|Measure the gap between the two events, not the time from the start of the plot.
Input slew|Which input edge spends more time between 20% and 80% voltage?|The gentler edge.|The steeper edge.|A gentle rise takes longer to cross the same voltage interval.
Output load|What changes if you connect another receiver to a driver?|The driver usually sees more capacitance.|The driver automatically becomes stronger.|The new receiver adds a load. The master's strength stays the same.
Timing arc|For an inverter, which output change can follow an input rise?|A fall.|Another rise.|In a negative-unate arc the direction reverses if the output changes.
Lookup table|The table rows are slew and columns are load. You increase load only. Where do you move?|Across columns.|Down rows.|The row coordinate stays fixed because the input slew did not change.
PVT corners|Can one passing nominal report establish timing at every specified voltage and temperature?|No. Check the required characterized conditions.|Yes. Nominal covers every condition.|Gate behavior changes with its operating condition. Analyze the required corners.
Setup and hold time|A signal changes just after the capture edge. Which requirement might it violate?|Hold.|Setup.|Hold protects the time after the edge. Setup protects the time before it.
Drive strength|What should you check after replacing a buffer with a stronger variant?|The load it adds to the previous stage.|Only the output of the new buffer.|The new input may be larger. A downstream improvement can make the upstream path slower.
Leakage power|All inputs stop switching, but the cell still has power. Can it draw current?|Yes, it can leak.|No, its current must be zero.|Leakage can occur while values stay steady.
Metal width|Where do you measure the width of a horizontal wire?|Between its bottom and top edges.|Between its left and right ends.|Width runs across the wire. Length runs along it.
Metal spacing|Two metal edges have a 0.08 µm gap and the example limit is 0.10 µm. Is this legal?|No. The edges are too close.|Yes. Any visible gap passes.|The gap must meet or exceed the minimum.
Pitch|Two wires are 0.10 µm wide and their centers are 0.24 µm apart. What gap is left?|0.14 µm|0.24 µm|Subtract the two half-widths from the center-to-center distance.
Offset|You shift the first track right and leave pitch alone. What happens to the rest?|They shift by the same amount.|They become farther apart.|Offset moves the pattern. Pitch controls the gaps within it.
Routing direction|M1 and M2 cross in the top view. Does that crossing connect them?|Only if a conductive connection such as a via joins the layers.|Yes, because their artwork overlaps.|Separate metal levels have insulation between them.
Via|What should you add where a signal must turn from M1 onto M2?|A via connecting M1 and M2.|An identical wire on another layer with no via.|A via makes the electrical path through the insulation.
Via enclosure|The cut is nearly touching the right edge of the metal. What is too small?|The right-hand enclosure.|The wire pitch.|Enclosure is the metal margin beyond the cut, measured at the edge.
Minimum area|A short patch is wide enough but too small in area. What example change could help?|Lengthen it while respecting nearby rules.|Shorten it further.|For a rectangle, area equals width times length.
Manufacturing grid|Which coordinate is aligned to a 0.005 µm grid with origin at zero?|0.015 µm|0.016 µm|0.015 µm is exactly three grid increments.
SIZE|Which attribute tells you the width and height of this cell's outline?|SIZE|ORIGIN|ORIGIN gives an offset. SIZE gives the dimensions.
ORIGIN|If the macro's local geometry is shifted horizontally, what should move together?|Its pins and obstructions.|Only the text labels.|Routing needs the actual pin and obstruction geometry in the same coordinate system.
SITE|The site width is 0.20 µm. How many slots fit a 0.60 µm cell?|3|2|Divide the cell width by one site's width.
PIN|The netlist asks for pin A. The LEF calls the only input B. What should you check first?|Whether the two views are from the same library release.|Whether the clock period is long enough.|The tool needs matching names to find the physical terminal.
PORT|Which part of a PIN tells the router where metal is available to touch?|Its PORT geometry.|Its SIGNAL use alone.|The port groups the actual shapes. SIGNAL describes the terminal's purpose.
LAYER|A wire overlaps a pin in top view but is on a different layer. What is still missing?|A legal layer connection.|A wider label.|The router needs a via or another conductive route between the layers.
RECT|What changes if only Xmax increases?|The right edge moves and the shape gets wider.|The whole rectangle shifts right.|The left edge stays at Xmin. Height is unchanged.
OBS|The direct path crosses an M1 obstruction. What route should you try?|A legal detour around it.|A wire straight through it.|The reserved area protects internal metal and its required clearance.
SYMMETRY|An off-center pin is on the left. Where does it go when mirrored about the vertical Y axis?|The right.|The bottom.|A vertical mirror exchanges left and right while preserving height.
Power rails|Two adjacent cells' VDD and VSS rails meet at the same physical edge. What should you check?|Cell orientation and supply alignment.|The cell function truth table.|Abutting cells should join matching rails.
Pin accessibility|The pin exists in LEF but no legal track or via can reach it. What is the issue?|Pin access.|A missing Boolean function.|Valid pin geometry still needs an approach that follows routing rules.
Clock period|Equivalent clock edges arrive at 0 ns and 8 ns. What is the period?|8 ns|4 ns|Measure rising edge to next rising edge, or falling edge to next falling edge.
Clock frequency|The period halves from 10 ns to 5 ns. What happens to frequency?|It doubles.|It halves.|Each cycle uses half the time, so twice as many fit into a second.
Clock uncertainty|What does extra setup uncertainty do to the latest safe arrival?|Moves it earlier.|Moves it later.|The analysis reserves more time, leaving less of the cycle for data.
Clock latency|Source travel takes 0.30 ns and ideal network travel takes 0.60 ns. What total latency does this example use?|0.90 ns|0.30 ns|Add travel before and after the clock definition point in this example.
Input delay|Which delay describes a board signal reaching this chip's incoming port?|Input delay.|Output delay.|The reference is the chip being analyzed. This data enters it.
Output delay|The next edge is at 10 ns. The external side needs 2 ns. When must this example output be ready?|8 ns|12 ns|Reserve the external time by moving the chip boundary deadline earlier.
Setup violation|Data arrives at 9.0 ns and is required by 8.3 ns. Does setup pass?|No, it arrives 0.7 ns late.|Yes, it has 0.7 ns to spare.|Setup slack is required time minus arrival time.
Hold violation|What is the problem if a new value reaches D too soon after the edge?|The old value was held for too little time.|The new value arrived too late.|Hold checks the earliest safe change.
False path|After adding a false-path exception, does the actual circuit wire disappear?|No. The selected timing checks change.|Yes. The router erases the wire.|An SDC exception affects analysis. The netlist still specifies connectivity.
Multicycle path|Should you set a two-cycle exception just because a one-cycle path is slow?|No. The circuit must deliberately allow the extra cycle.|Yes. The exception speeds up the circuit.|A timing exception changes the deadline. It cannot change when the hardware needs the data.
Generated clock|A clock divider uses divide-by-two on a 5 ns input clock. What is the generated period?|10 ns|2.5 ns|One generated cycle takes two parent periods.
Database units|At 1000 DBU per µm, how far is 4000 DBU?|4 µm|4000 µm|Divide the integer coordinate by the scale.
DIEAREA|What should you inspect if a macro is outside the imported outline?|The die bounds, units and component coordinates.|Only the cell's leakage power.|These physical views determine where the instance lands relative to the boundary.
Placement rows and tracks|Which grid determines legal starting slots for standard cells?|The placement rows.|The metal routing tracks.|Rows organize cells. Tracks organize possible wire positions.
Components, placement and orientation|If you move u1 to a new DEF X coordinate, what happens to its pin?|The pin moves with the cell.|The pin stays at its old location.|The tool transforms the pin's local position using the instance placement and orientation.
Top-level pins|Which record describes where routing from outside the block can land?|A top-level PINS record.|The library's cell area record.|The PINS record can describe the boundary terminal's metal layer, shape and position.
Nets and routed geometry|The endpoints are correct but the DEF route stops short. What does the drawing show?|A physical open.|A complete route just because both pins are listed.|The connection list says what should join. Metal geometry says what actually meets.
Blockages|Can an empty-looking region be unavailable for placement?|Yes, a blockage may reserve it.|No, blank space is always legal.|Read blockage records before judging the available area.
Power domains|Which block should remain powered to wake a sleeping CPU?|The controller in an always-on domain.|Only the sleeping CPU itself.|The wake-up decision must come from logic that still has power.
Supply ports, nets and power switches|The switch opens. Which supply should remain connected to the upstream power source?|The unswitched VDD supply.|Only the switched VDD_CPU supply.|The switch disconnects the downstream supply while upstream power remains available.
Isolation|When should isolation clamp the output of a switchable domain?|Before its supply is switched off.|Only after the receiver sees an unknown value.|Clamping first keeps the still-powered receiver from seeing an unreliable signal.
Retention|Which supply must stay live to remember state through the shutdown?|The retention supply.|Only the main switched supply.|The saved copy relies on the separate retention supply while the main supply is off.
Level shifting|A low-voltage signal enters a higher-voltage receiver. Which strategy may be needed?|Low-to-high level shifting.|A wider placement site.|A shifter produces a logic level suitable for the receiver's voltage.
Power states and sequencing|Does declaring OFF in UPF physically turn the block off at that exact moment?|No. The controller operates the actual switch.|Yes. The declaration schedules the edge.|The UPF entry describes a supply condition so tools can reason about it.
Extraction rules and RC corner|Which model should the extractor use for a routed design?|The model matched to the process and interconnect corner.|Any rules file with the same filename extension.|The calibrated data depends on the layer stack and process conditions.
Wire resistance|All else equal, which wire usually has higher resistance?|A longer wire of the same width and layer.|A shorter wire of the same width and layer.|The longer path gives current more material to travel through.
Ground and coupling capacitance|Which capacitance can directly model interaction between neighboring signals?|Coupling capacitance.|Ground capacitance alone.|Coupling has a terminal on each neighboring net.
SPEF annotation|A routed net has no SPEF annotation. What should you investigate first?|Name matching and whether the files are from the same revision.|The display colors in the viewer.|The timing tool must identify the same object before it can attach the RC model.
Modes and constraint sets|Normal operation and scan use different clock assumptions. Where should those assumptions live?|In separate mode constraints.|In identical constraints for both modes.|Keep each mode's clocks and exceptions consistent with the way it operates.
Library and parasitic corner data|Which input represents wire parasitics in this example corner?|The named rc_max SPEF.|slow.lib.|Liberty characterizes cells. SPEF represents the routed electrical network.
Analysis scenes|A design passes func_slow. Does that prove scan also passes?|No. Verify the required scan scenes.|Yes. Every mode inherits the pass.|Each scene uses its own mode and associated corner data.
Match the same cell across three files|Timing finds INV_X1/A, but LEF only has INV_X1/B. What is your first check?|Confirm that the cell views are from the same release.|Increase the clock period.|A new deadline will not repair a missing physical terminal.
Investigate an off-grid or blocked pin|The local pin rectangle looks fine. What should you overlay next?|Its placed shape, DEF tracks, and nearby obstructions.|The cell's input capacitance table.|Routing access depends on the geometry in design coordinates and the technology's rules.
Read a failing setup report|The report is −0.3 ns and the clock constraint matches the specification. What should you do first?|Verify the scene and inspect the cell and wire contributions.|Make the clock slower in SDC until slack turns positive.|A constraint should describe the real requirement. Investigate the path that missed it.
`;

export const practice = new Map(records.trim().split('\n').map((line, index) => {
  const [title, question, correct, other, explanation] = line.split('|');
  return [title, { question, correct, other, explanation, correctFirst: (index % 4) < 2 }];
}));
