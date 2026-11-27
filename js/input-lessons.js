const chapter = (title, file, source, text) => ({
  title,
  lessons: text.trim().split('\n\n').map(record => {
    const [title, what, why, code, meaning, engineer, tool, summary, ...frames] = record.split('\n');
    const rcSample = title === 'Extraction rules and RC corner';
    const crossFile = {
      'Reading chip maps': 'starter.def',
      'Match the same cell across three files': 'demo.v · demo_cells.lef · demo_tt.lib',
      'Investigate an off-grid or blocked pin': 'demo_cells.lef · demo.def',
      'Read a failing setup report': 'func.sdc · timing_scenes.tcl'
    };
    return { title, what, why, code: code.replaceAll('~', '\n'), meaning, engineer, tool, summary,
      filename: rcSample ? 'rules.openrcx.sky130A.max.calibre' : (crossFile[title] ?? file),
      reference: rcSample ? 'https://github.com/fossi-foundation/open-pdks/blob/main/sky130/librelane/rules.openrcx.sky130A.max.calibre' : source,
      frames: frames.map(line => { const [caption, drawing] = line.split('|'); return { caption, drawing }; }) };
  })
});
const sta = 'https://openroad.readthedocs.io/en/latest/main/openroad/sta/doc/Examples.html';
const lef = 'https://si2.org/lef-def-downloads/';
export const chapters = [
chapter('Start Here', 'starter.v', sta, `
A chip and a signal
A chip is a small piece of material called silicon with tiny electrical circuits built on it. An input brings in a signal. The chip reads a low or high voltage as a 0 or a 1. A wire carries that electrical change to another part of the circuit.
Picture a door sensor that tells a controller whether a door is open. The controller needs a real electrical connection to receive that information. Physical design turns a circuit description into a layout with locations for its parts and wires.
module door_status(input sensor, output alarm);~  assign alarm = sensor;~endmodule
input sensor is an incoming terminal. output alarm is an outgoing terminal. The assignment gives alarm the same value as sensor. This tiny Verilog logic example states the behavior before a physical layout exists.
Name the source, destination and expected value before looking for a broken connection. Later, match these design names to the physical terminals.
Read the design's interface and logic. Tools later use physical files to learn where the terminals are and what connects them.
A logic signal represents information carried by a real electrical connection.
Set the door sensor to 0. The example alarm is also 0.|b 52 77 172 63 Sensor · 0;a 227 108 412 108 signal;b 415 77 173 63 Alarm · 0
Set the sensor to 1. The alarm becomes 1 after the change reaches it.|g 52 77 172 63 Sensor · 1;a 227 108 412 108 signal;g 415 77 173 63 Alarm · 1
If the connection is open, a receiver cannot reliably learn the sensor's value.|b 52 77 172 63 Sensor · 1;a 227 108 306 108 signal;e 415 77 173 63 Alarm · unknown

Logic gates and memory
A gate is a tiny circuit that follows a rule. An inverter flips a 0 to a 1 or a 1 to a 0. A flip-flop is a different kind of circuit. It remembers the value at its data input when a clock edge tells it to sample.
Gate logic answers questions such as whether a door is closed. Memory keeps an answer available after the input changes. A design may use thousands or millions of these reusable circuits.
INV_X1 u_inv (.A(sensor), .Y(closed));~DFF_X1 u_store (.D(closed), .CLK(clk), .Q(saved));
A and Y are the inverter's input and output terminals. D is the flip-flop's data input, CLK is its clock input, and Q is the held output. These names depend on the chosen library.
Find out whether the reported pin belongs to a gate or a storage element. A storage element usually needs a correct data and clock connection.
Link each gate to its library model. Model the gate's input-to-output behavior and the flip-flop's clocked capture behavior.
A gate computes a value. A flip-flop keeps a sampled value.
The sensor is 0. The inverter output and the flip-flop input D are 1. Q still holds its old 0.|b 60 75 170 65 Inverter · Y = 1;a 232 108 408 108 D = 1;b 411 75 171 65 Saved Q = 0
On a rising clock edge the flip-flop samples D. Its Q becomes 1 after its response delay.|b 60 75 170 65 Inverter · Y = 1;a 232 108 408 108 D = 1;g 411 75 171 65 Saved Q = 1;a 505 40 505 72 clk edge
Without a working clock connection, the new value cannot be captured on the intended edge.|b 60 75 170 65 Inverter · Y = 1;a 232 108 408 108 D = 1;e 411 75 171 65 Q stays old;t 496 175 CLK disconnected

Reading chip maps
A physical layout is a map. X tells you how far to go sideways and Y tells you how far to go upward from the origin. Micrometres measure distance. One micrometre is one millionth of a metre.
Geometry matters because a cell needs a legal place to sit and a route needs to reach it. A top view shows where shapes overlap. A side view shows whether those shapes lie in different metal layers.
UNITS DISTANCE MICRONS 1000 ;~DIEAREA ( 0 0 ) ( 6000 4000 ) ;
These DEF lines use 1000 database units per micrometre. The rectangle runs from the origin to x = 6 µm and y = 4 µm.
Check units and the coordinate reference before comparing a tool report with a layout drawing.
Convert the numeric coordinates into database geometry and keep the metal layer attached to each shape.
Read the units, then the coordinates, then the layer.
Find the origin at the bottom left.|a 154 165 490 165 X;a 154 165 154 39 Y;t 135 190 (0, 0)
Walk right 6 µm and up 4 µm to locate the opposite corner. Fill the area between the points.|b 154 49 309 116 Die;t 479 32 (6, 4) µm;t 152 189 (0, 0)
Treating 6000 as micrometres instead of database units gives a wildly oversized map.|e 106 60 428 89 Wrong scale · 6000 µm;t 320 184 Expected width · 6 µm
`),
chapter('Netlist', 'demo.v', sta, `
Cell master versus cell instance
A master is the reusable design for a gate. An instance is one named copy in your chip. Two inverters can share a design while operating on completely different signals.
The tool needs the master to know what a copy does, and a unique instance name to know which copy to place or report.
INV_X1 u1 (.A(a), .Y(n1));~INV_X1 u2 (.A(b), .Y(n2));
INV_X1 names the inverter master. u1 and u2 name separate copies. A and Y are the input and output pin names.
Check that every master exists in the timing and physical libraries and that instance names are unique within their module.
Link each instance to its master's logical pins, physical outline and timing model.
One master can supply many independently named copies.
Start with a library inverter that flips its input.|b 190 36 260 54 INV_X1 master
Instantiate u1 and connect its own signals.|b 210 24 220 46 INV_X1;a 300 72 168 126;b 70 128 196 58 u1 · a → n1
Instantiate u2 from the same master with different signals.|b 210 24 220 46 INV_X1;a 300 72 168 126;a 340 72 470 126;b 70 128 196 58 u1 · a → n1;b 374 128 196 58 u2 · b → n2
If INV_X2 is missing from the loaded library, u2 cannot resolve its pins or physical size.|b 80 90 195 60 u1 · linked;e 356 90 198 60 u2 · unknown master

Pin mapping
A named pin connection joins a specific terminal of one cell copy to a named signal. It is like labeling which socket a cable plugs into.
Multi-input gates often have different jobs for different pins. A multiplexer uses one pin to choose between its two data inputs.
MUX2_X1 u_mux (.A(a), .B(b), .S(sel), .Y(y));
The name after each dot belongs to the master. The name in parentheses belongs to the surrounding design.
Check pin spelling, direction, bus bit indices and special pins such as clock or select.
Attach every named instance pin to its net, then use library directions to find drivers and receivers.
The pin is the socket. The net is the signal plugged into it.
Identify three input sockets and one output socket.|b 266 56 142 110 MUX2; t 215 74 A;t 215 112 B;t 215 151 S;t 449 111 Y
Join each signal to its labeled socket. With sel = 0 this example passes a to y.|b 266 56 142 110 MUX2;a 75 73 263 73 A ← a;a 75 111 263 111 B ← b;a 75 150 263 150 S ← sel (0);a 410 111 584 111 Y = a
Swapping B and S makes a data bit choose the input, changing the circuit behavior.|e 266 56 142 110 MUX2;a 75 111 263 111 B ← sel;a 75 150 263 150 S ← b

Nets
A net is a named electrical connection joining terminals. A driver sets the signal value and receiver pins read it.
Connectivity tells the placer which cells communicate and gives the router the endpoints a wire must join.
wire n;~BUF_X1 u1 (.A(a), .Y(n));~INV_X1 u2 (.A(n), .Y(y));
The shared n connects u1.Y to u2.A. The declaration supplies a name for that connection.
Check for floating inputs, unintended multiple drivers and unexpected connections.
Build a connectivity graph and create route endpoints from the physical pins of connected instances.
A net joins the driver and its receivers.
u1 receives a high input and drives its output high.|b 55 76 148 62 u1 · buffer;t 225 110 Y = 1;b 444 76 146 62 u2 · inverter
Follow n from u1.Y to u2.A. u2 then inverts the high value.|b 55 76 148 62 u1 · buffer;a 205 106 442 106 n carries 1;b 444 76 146 62 u2 · inverter;t 513 169 y = 0
With n disconnected, u2.A has no source for a valid value.|b 55 76 148 62 u1 · buffer;a 205 106 295 106 n;e 378 76 207 62 u2.A floating

Fan-out
Fan-out counts how many receiver inputs share one driver. Each receiver also contributes an electrical load that the driver must charge or discharge.
Large fan-out can slow down a transition, especially when receivers have large input capacitance or are far apart.
BUF_X1 u0 (.A(a), .Y(n));~INV_X1 u1 (.A(n), .Y(y1));~INV_X1 u2 (.A(n), .Y(y2));~INV_X1 u3 (.A(n), .Y(y3));
One output, u0.Y, drives three distinct input pins on n. The fan-out is three.
Inspect high-fan-out nets and check transition time, capacitance and any fan-out limits before changing the driver.
Count connected loads, evaluate their capacitance and estimate timing with wire parasitics when available.
Count the receivers, then check the load.
Trace the first receiver of n.|b 53 84 140 54 u0.Y;a 194 112 440 112 n;b 440 92 138 38 u1.A
The same net branches to two more inputs, for three receivers total.|b 53 84 140 54 u0.Y;a 195 111 440 111 n;a 318 111 440 47;a 318 111 440 174;b 440 28 138 38 u2.A;b 440 92 138 38 u1.A;b 440 155 138 38 u3.A
If the combined load is too large, the output can transition too slowly.|w 55 160 155 160 355 58 590 58;t 323 193 slow edge with heavy load

Hierarchy
A module can contain gates and other modules. The hierarchy is the tree of named copies inside copies.
Hierarchy lets engineers organize the design and refer to a precise object even when two blocks reuse the same internal names.
module block(input a, output y);~  INV_X1 u1 (.A(a), .Y(y));~endmodule~module top(input a, output y);~  block u_blk (.a(a), .y(y));~endmodule
top contains u_blk, a copy of block. Its inverter can be identified by the hierarchical path u_blk/u1.
Verify the intended top module, port directions and instance paths used by constraints.
Resolve module references, bind the ports and maintain hierarchy or flatten it into individually named objects.
Read an instance path from the outer block to the inner copy.
top contains u_blk, which exposes a and y.|b 80 34 480 140 top;b 216 84 207 59 u_blk (block)
Open u_blk to reveal u1 and its port connections.|b 80 27 480 164 top;b 180 64 284 105 u_blk;a 107 131 264 131 a;b 265 115 121 38 u1 INV;a 387 131 530 131 y
If a constraint names u_other/u1, the intended inverter is missed.|e 132 70 373 78 u_other/u1 · path missing

RTL versus netlist
Register-transfer level (RTL) describes what values a circuit computes and when state changes. A mapped netlist gives the actual types of gates and their connections.
Physical design needs objects with real dimensions, pins and delay models. Synthesis turns the RTL description into these objects.
assign y = ~(a & b); // RTL~NAND2_X1 u1 (.A(a), .B(b), .Y(y)); // mapped result
These are equivalent excerpts from two separate files. The Boolean expression becomes a NAND gate from the target library.
Confirm the netlist matches the intended RTL and uses masters from the correct library release.
Synthesis recognizes and maps the Boolean operation. Implementation then links the mapped gate to physical and timing views.
RTL says what to compute. The mapped netlist names the gates that compute it.
Read the rule: AND a and b, then invert the result.|b 191 72 258 70 y = ~(a & b)
Identify an equivalent library operation.|b 64 83 187 56 AND then invert;a 253 111 405 111 match;b 405 83 171 56 NAND2_X1
Create u1 and connect its actual pins.|a 80 89 246 89 A ← a;a 80 133 246 133 B ← b;b 248 65 148 93 u1 NAND2;a 398 111 563 111 Y → y
An unavailable mapped master leaves the physical tool without a cell outline or pin locations.|e 175 72 295 70 NAND2_X1 · LEF missing
`),
chapter('Liberty', 'demo_tt.lib', sta, `
Cell area
Area is the library's size metric for one cell. A larger drive variant often occupies more silicon, since it needs larger devices.
Synthesis and optimization compare the cost of different cell options. Placement obtains the actual footprint from LEF.
cell (INV_X1) {~  area : 0.72;~}
area is a per-master scalar. This example library uses square micrometres.
Compare the area convention with the library release and use LEF SIZE for placement dimensions.
Use the attribute for area reports and cost comparisons while keeping physical geometry in the LEF database.
Liberty gives an area number. LEF gives the footprint.
Outline the example footprint, 0.60 µm by 1.20 µm.|b 226 44 189 130 INV_X1;t 320 201 0.60 µm × 1.20 µm
Highlight the area inside the boundary. Multiplication gives 0.72 µm².|g 226 44 189 130 0.72 µm²
A wrong area distorts optimization cost and area reporting even if the LEF boundary is correct.|e 226 44 189 130 Reported 0.07 µm²

Cell function
The function describes the Boolean output rule using the input pins. Boolean values are represented as 0 and 1.
The timing model contains pin delays and also gives logic tools the information needed to reason about values and which timing arcs can be active.
pin (Y) {~  direction : output;~  function : "!A";~}
The exclamation mark means invert. Y reads 1 with A at 0 and reads 0 with A at 1.
Compare the output function against the matching logical model of the cell.
Interpret the expression as a logic equation for mapping, constant propagation and related analysis.
The function tells you which output follows each input combination.
Set A to 0. The inverter produces Y = 1.|a 65 110 228 110 A = 0;b 230 76 180 67 INV_X1;a 412 110 584 110 Y = 1
Change A to 1. The output becomes 0 after propagation.|a 65 110 228 110 A = 1;b 230 76 180 67 INV_X1;a 412 110 584 110 Y = 0
If the expression were A, the model would predict the wrong value.|a 65 110 228 110 A = 1;e 230 76 180 67 Wrong function;a 412 110 584 110 Y = 1

Input capacitance
An input pin behaves partly like a tiny charge store. The previous gate must move charge into or out of it each time the signal changes.
A driver with more capacitance attached usually takes longer to change voltage. Farads measure capacitance, and one femtofarad (fF) is 10⁻¹⁵ farads.
capacitive_load_unit (1, ff);~pin (A) { direction : input; capacitance : 2.0; }
The unit declaration makes capacitance 2.0 fF for A in this example.
Check the unit, pin variant and rise/fall capacitance where the model provides separate values.
Include the pin capacitance in the effective load seen by its upstream driver.
An input pin adds charge that the previous driver must move.
A driver starts changing the voltage at A.|b 55 76 160 64 Driver;a 216 109 414 109 charging;b 415 76 163 64 A · 2.0 fF
Increasing the input capacitance slows the educational voltage ramp at the same drive strength.|w 60 158 154 158 190 55 594 55;w 60 166 154 166 $load 64 594 64;t 458 191 Input capacitance;t 187 31 fast reference
If capacitance is understated, calculated transitions can look faster than the actual transitions.|e 235 71 208 67 Load understated

Propagation delay
Propagation delay measures the time from a chosen input crossing to the corresponding output crossing. Crossings are normally defined by voltage percentages in the library.
Signals require time to move through cells. Static timing analysis adds delays along connected paths to see whether data reaches a storage element on time.
timing () {~  related_pin : "A";~  cell_fall (scalar) { values ("0.032"); }~}
Inside output pin Y this example gives a falling output delay of 0.032 ns, or 32 ps, assuming time_unit is 1 ns.
Check the library thresholds, arc polarity, timing corner and whether the model uses a table.
Calculate input and output threshold crossing times using the relevant delay model.
Delay is the time between two related threshold crossings.
The input rises past its reference voltage.|w 68 72 188 72 188 42 576 42;t 189 27 A crossing
The output falls 32 ps later. The horizontal difference is the propagation delay.|w 68 72 188 72 188 42 576 42;w 68 116 380 116 380 154 576 154;a 188 177 380 177 32 ps;t 380 100 Y crossing
A delay modeled as zero erases the time gap and can hide a late path.|w 68 72 188 72 188 42 576 42;w 68 116 188 116 188 154 576 154;t 284 178 Wrong model · 0 ps

Input slew
Slew here means transition duration, measured between two voltage thresholds, such as 20% and 80% of the supply. A steep edge has a short duration.
An identical gate can respond differently to fast and slow input edges, affecting its own delay and the edge it passes to the next gate.
slew_lower_threshold_pct_rise : 20.0;~slew_upper_threshold_pct_rise : 80.0;~lu_table_template (delay_template) { variable_1 : input_net_transition; }
The thresholds define the measurement. input_net_transition names a table axis that accepts the measured duration.
Check for slow transitions and compare definitions when mixing library models or reports.
Measure or propagate slew and use it as an input to timing-table lookup.
Slew is how long an edge takes to change.
Mark the lower and upper voltage thresholds.|l 65 142 570 142 20%;l 65 64 570 64 80%
The steep ramp crosses the two thresholds close together. The gentle ramp takes longer.|l 65 142 570 142 20%;l 65 64 570 64 80%;w 70 166 165 166 218 42 580 42;w 70 174 165 174 471 50 580 50;t 211 198 fast;t 453 198 slow
A very slow transition may exceed the characterized or allowed range.|w 55 171 102 171 553 47 588 47;e 356 126 226 44 max slew exceeded

Output load
Output load is the electrical burden attached to a driving pin. It includes receiver inputs and can include wire capacitance.
More charge has to move for a larger load. That generally increases delay and makes the outgoing voltage transition longer.
lu_table_template (delay_template) {~  variable_1 : input_net_transition;~  variable_2 : total_output_net_capacitance;~}
total_output_net_capacitance identifies the load axis of this example timing table.
Compare the connected load against the output limits and check whether parasitics have been read.
Combine the downstream loads with the wire's parasitic model, then query the delay and slew tables.
More output capacitance generally means more charging time.
Start with a receiver and a short connection.|b 65 76 145 62 Driver;a 211 107 427 107 wire;b 430 76 143 62 Receiver
Increase load and watch the driver take longer to reach the same target voltage.|w 55 163 144 163 205 50 585 50;w 55 172 144 172 $load 61 585 61;t 327 197 Higher capacitance stretches the edge
An omitted load yields an overly fast timing estimate.|e 171 77 300 65 Receiver capacitance missing

Timing arc
An arc describes how an event at one pin affects another pin or a timing requirement. An inverter's input rise can cause its output to fall.
Different pins can have different delays even inside one gate. The analyzer needs the exact relationship for each path.
pin (Y) {~  timing () { related_pin : "A"; timing_sense : negative_unate; }~}
The arc goes from A to Y. negative_unate means an input rise can only cause an output fall or no change, and vice versa.
Check arc direction, polarity, and conditions that enable or disable the arc.
Create a timing graph edge and propagate the correct transition type between the pins.
An arc links a pin event to another event or requirement.
Select a rising transition on A.|b 60 83 153 58 A rises;b 432 83 153 58 Y
Follow the arc to a falling transition on Y.|b 60 83 153 58 A rises;a 216 111 428 111 negative_unate;b 432 83 153 58 Y falls
With the arc missing, analysis loses this modeled timing relationship.|b 60 83 153 58 A rises;e 432 83 153 58 Y · arc absent

Lookup table
A lookup table stores measured or simulated results at selected combinations of input slew and output load. Values between entries can be estimated from neighboring samples.
The same gate has different delays under different conditions. A table models that behavior with many samples.
cell_rise (delay_template) {~  index_1 ("0.02, 0.06");~  index_2 ("2, 6");~  values ("0.03, 0.05", "0.05, 0.09");~}
Rows are input slew in ns and columns are load in fF in this example. Each entry is rising-output delay in ns. The template defines the axes.
Verify axis order, units, model range and whether the result lies outside characterized points.
Find the surrounding entries and interpolate within the table. At 0.04 ns and 4 fF, the example average is 0.055 ns.
Use slew and load to locate the relevant delay samples.
Select the two slew rows around 0.04 ns.|t 368 38 Load (fF);t 130 85 Slew (ns);b 247 69 240 47 0.02 → 0.03 and 0.05;b 247 131 240 47 0.06 → 0.05 and 0.09
Select columns 2 and 6 fF around 4 fF. The four samples are equally weighted here.|t 291 41 2 fF;t 423 41 6 fF;g 236 65 110 44 0.03 ns;g 368 65 110 44 0.05 ns;g 236 122 110 44 0.05 ns;g 368 122 110 44 0.09 ns;t 355 197 Result · 0.055 ns
Swapped axes query the wrong conditions, and out-of-range values need tool-specific handling.|e 154 71 330 70 Axis units or range mismatch

PVT corners
PVT means process, voltage and temperature. Process describes manufacturing variation. Voltage and temperature describe the electrical and thermal conditions during use.
A circuit must satisfy timing over its specified operating range, since transistor behavior changes across conditions.
operating_conditions (SS_0P72V_125C) {~  process : 1.0; voltage : 0.72; temperature : 125;~}
The name identifies an example slow library operating point at 0.72 V and 125 °C. The numeric process field follows the library characterization convention.
Confirm every required corner has its matching Liberty and wire parasitic model. Review actual reports to find the worst case.
Use the loaded characterized library and corner data for the analysis scenario.
Check timing across manufacturing, voltage and temperature variation.
Launch the same input edge into two characterized models.|b 53 81 157 61 Common input;a 211 111 354 69;a 211 111 354 157;b 355 42 228 55 Nominal model;b 355 128 228 55 Slow example
Compare output times for the example. A later response reduces setup margin.|w 66 133 249 133 249 55 590 55;w 66 153 451 153 451 75 590 75;t 249 38 Nominal;t 463 191 Slow example
Using only nominal data can miss paths that fail under another characterized condition.|e 137 73 360 72 Slow scenario unchecked

Setup and hold time
A flip-flop stores a data value on a clock edge. Data should be stable for some time before the edge (setup) and after it (hold).
The storage circuit needs a window around the edge to capture data reliably. A violation means correct capture is no longer guaranteed.
pin (D) {~  timing () { related_pin : "CLK"; timing_type : setup_rising; }~  timing () { related_pin : "CLK"; timing_type : hold_rising; }~}
The timing groups on D refer to a rising CLK edge. Real groups also carry constraint values or tables.
Check that both setup and hold are analyzed and inspect the relevant launch and capture edges.
Use constraint tables to compute required arrival and earliest safe arrival times, then compare actual arrival times.
Keep data steady before and after the capture edge.
Mark the capture edge and its before/after stability window.|g 234 39 178 129 Stable window;l 320 34 320 178;t 245 191 setup;t 400 191 hold
Transition before the window, then keep D stable through the capture edge.|g 234 36 178 126 Stable window;w 63 148 173 148 173 103 584 103;l 320 34 320 175;t 320 193 CLK edge
A data transition inside the window violates setup to the left of CLK, or hold to the right.|e 234 36 178 126 Unsafe window;w 63 148 276 148 276 103 367 103 367 148 584 148;l 320 34 320 175;t 261 193 late;t 402 193 early

Drive strength
Drive strength describes how strongly a cell can charge or discharge its output. Libraries often offer several implementations of the same logic.
A stronger gate can improve an outgoing edge, but it may cost more area or power and can increase the load on its own input.
cell (BUF_X1) { area : 0.90; }~cell (BUF_X4) { area : 1.80; }
The names are library conventions, not guaranteed current ratios. These illustrative excerpts omit the timing and pin groups that characterize strength.
Compare input capacitance, output delay, output transition, area and power before sizing up.
Use each master's timing tables and legal sizing options when evaluating the trade-off.
Stronger drive changes the same load faster, with trade-offs.
Connect both buffer variants to the same hypothetical 8 fF load.|b 63 49 158 48 BUF_X1;a 224 73 436 73;b 439 49 140 48 8 fF;b 63 125 158 48 BUF_X4;a 224 149 436 149;b 439 125 140 48 8 fF
The stronger example reaches the target sooner under the same load.|w 62 150 119 150 265 49 584 49;w 62 174 119 174 460 73 584 73;t 266 33 X4;t 459 193 X1
An undersized buffer may exceed its allowed transition duration.|e 170 76 301 66 Transition limit exceeded

Leakage power
Even with no logic transitions, tiny currents can flow through transistors. The power drawn by those currents is leakage power.
Standby circuits can consume energy for long periods, so engineers estimate leakage separately from switching-related power.
leakage_power_unit : "1nW";~cell (INV_X1) { cell_leakage_power : 2.1; }
cell_leakage_power is a per-cell leakage value in the library's units, here 2.1 nW. Detailed libraries may add input-state-dependent leakage groups.
Compare the right operating corner, cell variant and standby input states.
Use characterized leakage values for state or cell estimates and accumulate them across instances.
A powered gate can leak even when its inputs are still.
Hold the input at a constant 0. The output stays at 1.|a 62 107 226 107 A = 0;b 229 73 182 68 INV_X1;a 413 107 580 107 Y = 1
A small supply current still flows. The modeled static power is 2.1 nW.|b 229 74 182 81 INV_X1;a 320 30 320 72 VDD;a 320 157 320 202 VSS;t 491 112 2.1 nW leakage
Omitting leakage underestimates standby power even when activity is zero.|e 156 77 329 66 Standby power underestimated
`),
chapter('Technology LEF', 'demo_tech.lef', lef, `
Metal width
Width is the distance across a wire, measured perpendicular to its length.
Thin wires are harder to manufacture reliably and have higher resistance for the same material and length.
LAYER M1~  TYPE ROUTING ;~  WIDTH 0.10 ;~END M1
WIDTH gives the default routing width in micrometres. A process can specify additional width rules.
Compare drawn width with the applicable layer and wire class rules.
Use the default width for regular routing and enforce applicable minimum-width checks.
Measure width across the wire.
Locate the edges of one M1 wire.|b 95 96 450 45 M1 wire;a 556 96 556 141 0.10 µm
Adjust the example width to move both edges away from or toward the centerline.|b 95 $top 450 $width M1 wire;l 90 118 555 118 centerline
An example minimum of 0.10 µm rejects the 0.06 µm wire.|e 95 104 450 27 0.06 µm · too narrow

Metal spacing
Spacing is the empty gap between nearby metal edges. It differs from the distance between wire centers.
A gap that is too small can cause neighboring wires to short during manufacture.
LAYER M1~  TYPE ROUTING ;~  SPACING 0.10 ;~END M1
This simple rule requires a 0.10 µm gap. Real rules can also depend on dimensions and neighboring shapes.
Measure the edge-to-edge gap and identify the applicable spacing rule.
Reject candidate wire geometry that comes too close to existing metal.
Spacing is the empty gap between metal edges.
Place a fixed M1 wire and identify its lower edge.|b 100 46 436 40 M1 wire 1
Move the second wire. The displayed status compares the gap with the 0.10 µm minimum.|b 100 46 436 40 M1 wire 1;$gapbox 100 $gaprow 436 40 M1 wire 2;a 553 86 553 $gaprow $gap;t 321 190 $gapstatus
A 0.06 µm gap violates the example rule. This indicates a manufacturing risk.|b 100 46 436 40 M1 wire 1;e 100 110 436 40 M1 wire 2;a 553 86 553 110 0.06 µm

Pitch
Pitch is the repeat distance between adjacent routing track centerlines.
Track pitch affects how many wires fit across a region. A default grid helps the router organize them.
LAYER M1~  TYPE ROUTING ;~  PITCH 0.24 ;~END M1
PITCH sets the nominal repeat distance on the routing grid in micrometres.
Verify pitches against the technology and compare actual design tracks when imported from DEF.
Use pitch to construct or seed a regular set of candidate positions.
Pitch is centerline to centerline.
Draw the centerline of the first track.|l 84 53 554 53 Track 1
Repeat the track every 0.24 µm and measure center to center.|l 84 53 554 53;l 84 109 554 109;l 84 165 554 165;a 460 53 460 109 0.24 µm;a 460 109 460 165 0.24 µm
A dense pitch for the chosen width may leave too little edge spacing between adjacent wires.|e 94 60 440 35 Wire 1;e 94 109 440 35 Wire 2

Offset
Offset sets the location of the first track relative to the grid origin. Pitch sets the repeat distance from there.
Shifting tracks can align them with standard-cell pins or move them away from legal landing positions.
LAYER M1~  TYPE ROUTING ;~  OFFSET 0.12 ;~  PITCH 0.24 ;~END M1
The first nominal position is 0.12 µm from the origin, followed by positions 0.24 µm apart.
Check track alignment with the supplied pin and via geometries.
Use offset as the anchor for the repeated track coordinates unless explicit tracks govern the design.
Offset starts the grid. Pitch repeats it.
Mark the origin line.|l 89 54 89 174;t 89 189 0 µm
Shift the first track to 0.12 µm and repeat at the pitch.|l 89 50 89 170;l 175 50 175 170;l 347 50 347 170;l 519 50 519 170;a 89 155 175 155 0.12 µm;a 175 90 347 90 0.24 µm
A shifted track can miss a pin that was aligned to the original grid.|l 229 44 229 174;e 151 92 46 40;t 171 153 Pin;t 319 189 Track misses pin

Routing direction
Each routing layer commonly favors one direction for wires, such as east–west or north–south.
Layer preferences simplify routing organization and crossings. The rules and routing settings determine when a nonpreferred segment is allowed.
LAYER M1~  TYPE ROUTING ;~  DIRECTION HORIZONTAL ;~END M1~LAYER M2~  TYPE ROUTING ;~  DIRECTION VERTICAL ;~END M2
The direction names identify the preferred direction for each layer.
Check routing preferences, restrictions and planned crossings for each layer.
Set track orientation and routing costs or restrictions based on the layer rules.
The preferred direction organizes routes on each layer.
Follow an east–west segment on M1.|b 96 95 447 30 M1;a 110 153 529 153 horizontal
Follow a north–south segment on M2 across the M1 projection. The layers can cross without joining.|b 96 95 447 30 M1;g 291 27 57 162 M2;a 381 38 381 183 vertical
Many unwanted nonpreferred segments can increase congestion or violate layer rules that restrict such segments.|e 299 36 47 151 M1;t 442 194 Nonpreferred vertical segment

Via
A via is a conductive connection through the insulating material between two metal layers. Its cut is the opening that connects the metal.
A route on one layer needs a via to continue electrically on another layer.
VIA VIA12 DEFAULT~  LAYER M1 ; RECT -0.07 -0.07 0.07 0.07 ;~  LAYER V1 ; RECT -0.04 -0.04 0.04 0.04 ;~  LAYER M2 ; RECT -0.07 -0.07 0.07 0.07 ;~END VIA12
The via definition gives a lower metal landing, a cut on V1, and an upper metal landing in micrometres relative to the via origin.
Verify the via matches the layer pair and meets cut, enclosure and spacing rules.
Instantiate the via at a legal point to connect the lower and upper route shapes.
A via joins conductors on different layers.
Draw M1 and M2 in cross section with insulating space between them.|b 98 135 235 35 M1;g 307 48 235 35 M2
Insert the cut connection so the conducting path reaches M2.|b 98 135 235 35 M1;g 307 48 235 35 M2;g 306 82 28 54;a 185 117 301 117 V1 cut;a 339 105 478 105 current can pass
Without the via the wires overlap in a top view but are electrically open.|b 98 135 235 35 M1;g 307 48 235 35 M2;e 307 88 29 41;t 431 114 Open connection

Via enclosure
Enclosure is the metal extension beyond a via cut's edge. Both adjacent metal layers need adequate coverage.
Manufacturing alignment varies slightly. Sufficient overlap helps the cut remain connected to the metal.
LAYER V1~  TYPE CUT ;~  ENCLOSURE 0.03 0.03 ;~END V1
This illustrative cut-layer rule requires 0.03 µm extension in each specified direction.
Measure extensions on the correct layer for the cut orientation and via rule.
Test the cut and its metal shapes against enclosure checks before accepting the via.
Enclosure is the metal margin beyond a cut.
Draw the cut in top view.|g 274 68 90 90 Cut;t 317 184 0.08 µm cut
Draw the surrounding metal and measure beyond the cut edge.|b 235 30 168 166;g 274 68 90 90 Cut;a 364 115 403 115;t 486 110 0.03 µm margin
Shifting the cut close to the edge leaves inadequate enclosure on the right.|b 235 30 168 166;e 310 68 90 90 Cut;t 503 110 0.002 µm margin

Minimum area
Minimum area specifies the smallest allowed area of a metal shape or connected metal as defined by the rule.
A short metal stub can meet the width requirement yet still be too small to manufacture reliably.
LAYER M1~  TYPE ROUTING ;~  AREA 0.04 ;~END M1
AREA is expressed in square micrometres. For the simple isolated rectangle here, multiply length by width.
Check short segments and via landings, and verify how the actual process measures connected metal.
Reject too-small patches or extend routing metal where permitted.
A legal width can still enclose too little metal area.
Measure a 0.10 µm by 0.20 µm patch. It has 0.02 µm² of metal.|b 220 79 180 76 0.02 µm²;t 310 182 0.10 µm × 0.20 µm
Extend the length to 0.40 µm to reach 0.04 µm².|g 132 79 356 76 0.04 µm²;t 311 182 0.10 µm × 0.40 µm
The original small patch fails even though the width is unchanged.|e 220 79 180 76 Min-area violation

Manufacturing grid
The manufacturing grid is the small coordinate increment on which geometry must align.
Manufacturing data uses discrete legal coordinates. A routing track grid can use a coarser spacing.
MANUFACTURINGGRID 0.005 ;
The geometry grid increment is 0.005 µm. A coordinate such as 0.011 µm is off this grid.
Check shape vertices and coordinate conversions, especially after scaling or importing data.
Validate or snap permitted coordinates to legal increments according to tool behavior.
Valid geometry coordinates land on grid increments.
Mark legal grid coordinates separated by 0.005 µm.|l 100 72 100 156;l 245 72 245 156;l 390 72 390 156;l 535 72 535 156;t 100 182 0.000;t 245 182 0.005;t 390 182 0.010;t 535 182 0.015 µm
Land a rectangle edge exactly at 0.010 µm.|l 245 46 245 173;l 390 46 390 173;g 245 83 145 58 Aligned;t 390 194 0.010 µm
An edge at 0.011 µm sits between grid lines and can be flagged or rounded during translation.|l 390 40 390 166;l 535 40 535 166;e 245 80 174 65 Off-grid;t 421 190 0.011 µm
`),
chapter('Standard Cell LEF', 'demo_cells.lef', lef, `
SIZE
SIZE gives width and height of a cell's abstract placement boundary.
Neighbors need enough space for the full footprint. Cell height must be compatible with the placement site and rows.
MACRO INV_X1~  SIZE 0.60 BY 1.20 ;~END INV_X1
The cell is 0.60 µm wide and 1.20 µm high.
Compare boundary dimensions and site multiples with the physical library and layout.
Reserve that footprint during placement and use it to detect overlaps.
SIZE gives a cell’s width and height.
Identify the boundary from lower-left to upper-right.|b 210 42 150 124 INV_X1;t 189 103 1.20 µm;t 285 190 0.60 µm
Change width to see how much horizontal space the cell occupies.|g 156 42 $size 124 INV_X1;t 215 190 Width $cellWidth · height 1.20 µm
A wrongly small outline can allow neighboring actual layouts to overlap.|b 116 65 238 89 Actual cell;e 303 65 213 89 Neighbor

ORIGIN
ORIGIN shifts the macro geometry from its local drawing coordinates into the cell's placement coordinate convention.
The footprint, pins and obstructions must land together where tools place the macro.
MACRO DEMO~  ORIGIN 0.10 0.00 ;~  SIZE 0.80 BY 1.20 ;~END DEMO
The tool adds the 0.10 µm X origin offset to macro geometry coordinates before aligning the macro at its design location.
Check that the abstract aligns to the corresponding layout at the same placement point.
Apply the origin shift and the requested orientation when transforming local geometry.
ORIGIN aligns local geometry to the placement reference.
Find the local placement reference at x = 0.|l 170 42 170 177;b 170 63 260 95 Cell outline
Shift example geometry by the X origin offset.|l 170 42 170 178;g 215 63 260 95 Shifted geometry;a 170 177 215 177;t 330 190 shift · 0.10 µm
An incorrect offset displaces the pin relative to the routed landing.|b 170 62 300 93;g 301 99 34 29 Pin;e 352 99 34 29;a 529 113 388 113 Wrong landing

SITE
A site is a repeatable legal placement slot. A row is a series of these slots.
Compatible slots align cell edges and help cells share power rails when placed next to one another.
SITE coreSite~  CLASS CORE ;~  SIZE 0.20 BY 1.20 ;~END coreSite~MACRO INV_X1~  SITE coreSite ;~END INV_X1
coreSite defines a 0.20 µm by 1.20 µm slot. The macro declares its compatible site.
Check row site, cell dimensions and orientation compatibility.
Allow placement positions on compatible row locations and legalize cells to those positions.
A SITE is a legal placement slot.
Draw repeating 0.20 µm slots in a row.|b 100 75 90 75;b 190 75 90 75;b 280 75 90 75;b 370 75 90 75;b 460 75 90 75;t 145 176 0.20 µm
Align a 0.60 µm cell over exactly three slots.|b 100 75 450 75;g 190 75 270 75 0.60 µm cell;l 280 75 280 150;l 370 75 370 150
A cell beginning between slots is off-site even if there is empty space.|l 190 42 190 163;l 280 42 280 163;e 228 68 270 79 Off-site placement

PIN
A pin is a named terminal of a cell. Its geometry provides one or more physical places to attach a wire.
The interface must connect the logical netlist terminal to a real conductive landing.
PIN A~  DIRECTION INPUT ;~  USE SIGNAL ;~  PORT~    LAYER M1 ; RECT 0.10 0.20 0.18 0.35 ;~  END~END A
A names the terminal, INPUT labels it as a receiver and SIGNAL distinguishes it from supplies.
Match pin names and directions with the cell's logical and timing models.
Create a physical terminal and attach routed nets using its available port geometry.
A PIN is a named physical terminal.
Locate named terminal A on the cell outline.|b 199 44 237 124 INV_X1;g 220 106 39 35 A
Bring the incoming net to the metal of A.|b 199 44 237 124 INV_X1;g 220 106 39 35 A;a 63 123 219 123 input net
Renaming it to B leaves logical pin A without the expected landing.|b 199 44 237 124 INV_X1;e 220 106 39 35 B;a 63 123 181 123 A missing

PORT
A PORT groups geometry for a physical connection point within a named pin. Multiple shapes can describe access for the same terminal.
Routes need actual metal to touch, and larger or alternative port shapes can give the router more access choices.
PIN A~  PORT~    LAYER M1 ;~    RECT 0.10 0.20 0.18 0.35 ;~    RECT 0.16 0.26 0.26 0.32 ;~  END~END A
The two overlapping M1 rectangles belong to the same PORT inside PIN A and form a connected landing.
Check geometry connectivity and possible access from nearby tracks. For multiple PORT groups, observe their required connection semantics.
Convert the grouped shapes into candidate connection areas for the pin.
A PORT gives the terminal a physical landing.
Highlight the first port rectangle.|b 155 47 332 122;g 232 72 57 76;t 320 190 A · M1 port
Add the overlapping rectangle and approach from the right.|b 155 47 332 122;g 232 72 57 76;g 276 87 91 29;a 556 101 369 101 Route to A
A port reduced to a tiny shape may contain no legal track or via landing.|b 155 47 332 122;e 259 109 17 16;l 192 94 462 94;t 318 189 Track misses port

LAYER
Within a pin's PORT, LAYER selects the material layer for the following shapes.
Shapes at the same X and Y on different layers require a via to connect.
PORT~  LAYER M1 ;~  RECT 0.10 0.20 0.18 0.35 ;~END
This rectangle is drawn on M1. It has a different electrical and routing identity from an identical M2 rectangle.
Check that the named layer exists in the technology LEF and matches the actual pin metal.
Use the declared layer to choose same-layer routes or legal layer transitions.
LAYER identifies which metal carries the shape.
Draw the M1 pin and a separate M2 wire in side view.|b 104 134 229 31 M1 pin;g 310 49 234 31 M2 wire
Insert a via to connect the upper wire to the lower pin.|b 104 134 229 31 M1 pin;g 310 49 234 31 M2 wire;g 309 79 24 56;a 338 106 494 106 Via connects layers
If the abstract labels the pin M2, the router can think the connection is complete while actual M1 remains isolated.|b 104 134 229 31 Actual M1 pin;e 310 49 234 31 Wrong M2 label;t 422 183 Physical open

RECT
RECT supplies opposite corners of an axis-aligned rectangle. A pin can be represented by one or several such shapes.
Tools use the area to determine where a wire or via can physically land.
LAYER M1 ;~RECT 0.10 0.20 0.18 0.35 ;
The lower-left corner is (0.10, 0.20) µm and upper-right is (0.18, 0.35) µm.
Check that coordinates are ordered, on grid and match the intended metal.
Create a rectangle on the current layer and translate it with the instance placement.
Two opposite corners define a rectangle.
Plot the two example coordinates.|l 119 174 542 174;l 119 174 119 35;g 228 129 10 10;g 391 58 10 10;t 206 152 (0.10, 0.20);t 440 43 (0.18, 0.35)
Fill between the corners. Move Xmax to resize the right edge.|l 119 174 542 174;l 119 174 119 35;g 233 63 $rect 71 M1;t 376 192 Xmax $xmax
Identical left and right coordinates collapse the rectangle to a line with zero area.|l 233 60 233 135;e 281 75 233 49 Zero-width shape

OBS
OBS describes physical obstructions in a macro abstract. These are areas where routing needs to stay clear.
Internal macro geometry can occupy metal even when the router cannot see the full layout.
OBS~  LAYER M1 ;~  RECT 0.24 0.36 0.52 0.82 ;~END
The rectangle reserves an area on M1. Its X and Y bounds are measured in micrometres in the macro coordinate system.
Check layer coverage, clearances and that pin access remains available.
Avoid routing through these areas using the obstruction and applicable spacing rules.
OBS marks where routing must avoid internal geometry.
Mark the obstruction between two M1 endpoints.|e 245 60 150 92 OBS · M1;t 86 107 Source;t 548 107 Destination
Detour around the obstacle with clearance.|e 245 60 150 92 OBS · M1;w 122 110 177 110 177 174 462 174 462 110 504 110;t 320 198 Legal detour
A missing obstruction can permit a route through hidden metal.|e 245 60 150 92 Hidden metal;a 117 104 503 104;t 319 180 Potential conflict

SYMMETRY
SYMMETRY lists transformations the macro geometry supports, such as mirroring across X or Y.
Placement rows can require a mirrored cell to line up power rails and match the allowed orientation.
MACRO INV_X1~  SYMMETRY X Y ;~END INV_X1
X and Y allow reflection about those axes as part of the supported orientations. Row and site rules also matter.
Verify legal orientations against site, row and power-rail alignment.
Transform outlines, ports and obstructions together when orienting an instance.
SYMMETRY describes the supported geometric transformations.
Place the cell normally and locate its off-center pin A.|b 196 55 247 108 Cell normal;g 213 120 31 27 A
Mirror about the vertical Y axis. A moves from left to right.|b 196 55 247 108 Mirrored;g 395 120 31 27 A;l 319 49 319 171;t 321 192 Y mirror axis
A disallowed rotation may place the rails across the row instead of along it.|b 188 60 264 101 Row;e 306 60 29 101 Rail;t 318 186 Rail orientation conflicts with row

Power rails
VDD delivers power and VSS is the ground return in this example. Rails are long metal pins that let cells in a row share supplies.
Every powered cell needs a continuous power and ground connection for its transistors to operate as expected.
PIN VDD~  DIRECTION INOUT ;~  USE POWER ;~  PORT~    LAYER M1 ; RECT 0.0 1.10 0.60 1.20 ;~  END~END VDD
USE POWER marks this VDD pin. A matching VSS pin normally uses USE GROUND.
Check supply names, row orientation and continuity across abutted cells and straps.
Connect supply-class terminals with the special power-routing or connection rules.
VDD and VSS rails must connect along the row.
Mark the top VDD and bottom VSS rails on a cell.|b 118 46 195 119 Cell 1;g 118 46 195 31 VDD;b 118 134 195 31 VSS
Abut another correctly oriented cell and extend both rails.|b 118 46 390 119 Cell 1 and cell 2;g 118 46 390 31 Continuous VDD;b 118 134 390 31 Continuous VSS;l 313 76 313 134
Incorrect rail orientation can connect unlike supplies when cells abut.|g 118 45 195 34 VDD;e 313 45 195 34 VSS;t 318 194 Supply conflict

Pin accessibility
Pin accessibility asks whether a real route can land on the pin while respecting layers, tracks and clearances.
A pin may look large in isolation but be blocked by a neighboring pin, an obstruction or a via enclosure limit.
PIN A~  PORT~    LAYER M1 ; RECT 0.10 0.20 0.28 0.40 ;~  END~END A
Accessibility is inferred from the port geometry plus routing rules and neighbors. This rectangle defines a possible landing area.
Inspect legal access points across orientations and neighboring placements.
Try legal tracks and via geometries, and reject landings that violate neighboring rules.
A physical pin needs a legal way in.
Overlay a legal track through the pin and land on it.|g 270 68 115 89 A;l 84 111 556 111;a 103 111 270 111;t 319 189 Track crosses pin metal
Try a nearby via landing with room for the required enclosure.|g 270 68 115 89 A;g 317 99 28 28 Cut;a 331 50 331 96 From upper layer
Nearby obstruction blocks a candidate approach and can leave the pin unroutable.|g 270 68 115 89 A;e 236 51 82 128 OBS;a 91 110 228 110 Blocked;t 414 188 No legal access on this approach
`),
chapter('SDC', 'func.sdc', sta, `
Clock period
The period is the elapsed time from one clock edge to the next edge of the same kind. A clock synchronizes operations throughout a design.
The period defines the usual amount of time a one-cycle data transfer has to reach its destination.
create_clock -name core_clk -period 10.0 [get_ports clk]
This defines core_clk on input clk. In a timing session using ns, rising edges are 10 ns apart.
Verify the port and intended clock period using reports.
Build the clock waveform and use the appropriate edges when calculating data deadlines.
Period measures time between equivalent clock edges.
Start at the first rising edge.|w 66 147 145 147 145 70 290 70;t 146 175 Rise · 0 ns
Advance to the next rising edge. Try changing the example period.|w 66 147 145 147 145 70 $half 70 $half 147 $edge 147 $edge 70 587 70;a 145 184 $edge 184 $period
If the period is modeled longer than the design's actual clock, a late path can appear to pass.|e 135 75 370 70 Too much time budgeted

Clock frequency
Frequency counts how many clock cycles occur each second. With the period in ns, frequency in MHz equals 1000 divided by the period.
Frequency is often specified for the system while SDC describes period. Correct conversion is necessary for meaningful timing.
create_clock -name core_clk -period 5.0 [get_ports clk]
A period of 5 ns creates a 200 MHz clock. Frequency is implicit in the period.
Check conversion and compare the reported period with the product specification.
Analyze edge times spaced by the specified period.
Shorter period means more cycles per second.
At 100 MHz, a clock completes one cycle every 10 ns.|w 65 148 65 71 310 71 310 148 560 148 560 71;t 308 190 One 10 ns cycle
At 200 MHz, the same interval contains two cycles.|w 65 148 65 71 189 71 189 148 313 148 313 71 437 71 437 148 561 148 561 71;t 308 190 Two 5 ns cycles
Entering 200 as a period creates a 200 ns clock, only 5 MHz.|e 124 76 389 67 200 ns ≠ 200 MHz

Clock uncertainty
Uncertainty is timing margin associated with possible clock edge variation and other modeled clock allowances.
A path designed with zero margin can become fragile when real clock edges shift.
set_clock_uncertainty -setup 0.20 [get_clocks core_clk]~set_clock_uncertainty -hold 0.10 [get_clocks core_clk]
The setup and hold analyses receive separate margins in the timing session's units.
Check margins from the timing specification and avoid double-counting allowances already represented by the clock model.
Tighten setup and hold requirements for the affected checks.
Uncertainty reserves time for clock variation and margin.
Mark the nominal capture edge.|l 424 53 424 169;t 421 192 Nominal edge
Move the setup deadline earlier and the hold threshold later.|e 343 62 139 93 Reserved margin;l 424 38 424 177;a 422 180 343 180 0.20 ns;a 428 180 483 180 0.10 ns
With uncertainty omitted, apparent margin can include time reserved for clock variation.|g 344 64 80 90 Apparent slack;t 382 193 Reserve omitted

Clock latency
Latency is clock travel time to a reference point or a receiving pin. Source latency describes travel before the clock definition point. Network latency describes travel beyond it.
The relative arrival times at launching and capturing cells can change setup and hold margin.
set_clock_latency -source 0.30 [get_clocks core_clk]~set_clock_latency 0.60 [get_clocks core_clk]
The example uses 0.30 ns source latency and 0.60 ns estimated network latency for an ideal clock.
Distinguish ideal latency estimates from delays computed after clock routing, and check launch and capture arrival times.
Add source latency and use either ideal network latency or propagated clock-network delay as applicable.
Latency is how long the clock takes to get there.
Trace the external source to the definition point.|b 45 82 128 53 Source;a 175 108 258 108 0.30 ns;b 260 82 126 53 clk port
Continue from the definition point to a register clock pin.|b 45 82 128 53 Source;a 175 108 258 108 0.30 ns;b 260 82 126 53 clk port;a 388 108 495 108 0.60 ns;b 497 82 111 53 CLK pin;t 511 175 Arrival · 0.90 ns
An omitted latency assumption can make relevant input, output or inter-clock timing relationships inaccurate.|e 187 76 298 65 Clock arrival shifted

Input delay
Input delay models when data from outside the design reaches an input port relative to a reference clock edge.
An external device and board traces use part of a timing budget before the signal even reaches the chip.
set_input_delay -clock core_clk -max 2.0 [get_ports din]~set_input_delay -clock core_clk -min 0.4 [get_ports din]
The latest input arrival is 2.0 ns and the earliest is 0.4 ns relative to the selected edge in this example.
Check board and source timing assumptions, min and max values, and the reference clock.
Start internal input paths from the specified external arrival times.
Input delay gives the external arrival time.
Launch data outside the chip at a clock edge.|b 47 77 164 60 External device;l 407 47 407 168;t 407 186 Chip boundary
Follow data to din. Internal timing starts with the latest or earliest arrival as appropriate.|b 47 77 164 60 External device;a 214 108 399 108 0.4–2.0 ns;l 407 47 407 168;b 409 77 164 60 din · chip
If late external arrival is omitted, the path can appear to have more time than it really does.|e 176 72 290 74 External travel omitted

Output delay
Output delay describes the outside receiver's timing needs relative to a reference clock. The internal design must deliver data with time left for the external path.
The chip boundary does not tell timing analysis how much time an external board trace and receiver need.
set_output_delay -clock core_clk -max 2.0 [get_ports dout]~set_output_delay -clock core_clk -min -0.3 [get_ports dout]
The 2.0 ns max example reserves time for board travel and receiver setup. The min value follows the SDC sign convention and can be negative due to receiver hold.
Derive min and max separately from board travel, receiver requirements and clock assumptions.
Convert the external constraints into required output arrival times for late and early timing checks.
Output delay reserves time for the external receiver and connection.
Place the receiving device outside the design boundary.|b 61 73 158 63 Chip · dout;l 229 45 229 165;b 407 73 179 63 Receiver
With a 10 ns edge and 2 ns output budget, the illustrative chip deadline is 8 ns.|b 61 73 158 63 dout by 8 ns;a 221 106 404 106 Reserved 2 ns;b 407 73 179 63 Capture at 10 ns
Without the external budget, data can leave the chip too late for the receiving device.|e 61 73 158 63 dout at 9 ns;a 221 106 404 106 arrives late;b 407 73 179 63 Receiver

Setup violation
Setup fails if late data arrives after the latest safe time before a capture edge. Slack measures how early or late the arrival is relative to the requirement.
A setup failure means a destination may capture an old or unreliable value at the target operating speed.
create_clock -name core_clk -period 10.0 [get_ports clk]~set_clock_uncertainty -setup 0.20 [get_clocks core_clk]
This SDC sets the period and setup margin. The setup check itself comes from the destination cell model.
Look for negative setup slack and inspect the path's data delay, clocks and constraints.
Subtract arrival time from required time. The educational model uses period minus 0.70 ns total margin minus 9.0 ns arrival.
Setup fails when data arrives too late.
Mark the example launch-to-arrival time as 9 ns.|w 63 145 444 145 444 93 590 93;t 442 169 Arrival · 9.0 ns
Move the period and compare the deadline with the arrival. Positive or zero example slack passes.|w 63 145 444 145 444 93 590 93;l $deadline 38 $deadline 158;a 444 65 $deadline 65;t 325 188 $slack
At a 9 ns period, required time is 8.3 ns. Arrival at 9 ns gives −0.7 ns slack.|e 377 48 69 115 Late;l 377 34 377 175;w 63 146 444 146 444 94 586 94;t 322 195 Deadline 8.3 ns · arrival 9 ns

Hold violation
Hold fails if newly launched data changes a destination input before the earliest safe time after the capture edge.
Storage needs the previous value to remain stable immediately after the edge. Making a simple same-edge clock slower does not fix a minimum-delay path.
set_clock_uncertainty -hold 0.10 [get_clocks core_clk]
This adds 0.10 ns of margin to hold checks. The receiving library cell defines its intrinsic hold time.
Check the fastest paths, clock skew and early analysis assumptions before adding delay.
Compare earliest data arrival against the earliest permitted change, using early data-path models and the relevant clock arrivals.
Hold fails when data changes too early.
At the capture edge the old data must remain stable through the highlighted window.|l 240 40 240 171;g 240 54 150 103 Hold window;t 240 192 Capture edge
The new data may change after the window ends.|l 240 39 240 170;g 240 54 150 103 Hold window;w 60 135 446 135 446 83 580 83;t 465 190 Safe change
A short path changes the data before the hold window closes.|l 240 39 240 170;e 240 54 150 103 Hold window;w 60 135 317 135 317 83 580 83;t 330 190 Early change

False path
A false path is a timing exception used to remove selected paths from particular normal timing checks. One example is a carefully scoped asynchronous crossing into a synchronizer.
Analyzing unrelated clocks as though their edges were synchronized produces meaningless synchronous requirements. The crossing still needs an appropriate design and verification method.
set_false_path -from [get_clocks ext_clk] -to [get_pins sync1/D]
This example excludes the selected ext_clk paths ending at sync1/D from normal setup and hold checks.
Prove each excluded crossing is intentional and review which paths the object selections match.
Suppress applicable timing checks for matching paths while retaining their logical and physical connectivity.
A false-path exception changes timing checks. The wire remains connected.
Identify a crossing from ext_clk to the first synchronizer stage.|b 58 78 154 58 ext_clk data;a 214 107 425 107 Async crossing;b 429 78 153 58 sync1/D
Keep the physical connection and exclude the selected synchronous timing check.|b 58 78 154 58 ext_clk data;l 214 107 425 107 Still connected;g 429 78 153 58 Check excluded
An overly broad exception can hide a genuine violation on a clocked path.|e 116 75 410 69 Real synchronous path hidden

Multicycle path
A multicycle exception changes which clock edges are used for selected timing checks. It applies when the circuit protocol deliberately allows additional cycles for a transfer.
The default single-cycle deadline penalizes a path that only needs to deliver data every second cycle in this example.
set_multicycle_path 2 -setup -from [get_cells launch] -to [get_cells capture]~set_multicycle_path 1 -hold -from [get_cells launch] -to [get_cells capture]
For this same-clock example, setup uses the second capture edge, and the paired hold adjustment preserves the intended hold relationship.
Verify enable or protocol behavior and confirm actual setup and hold edge pairings in timing reports.
Move the relevant timing check edge relationships for the matching paths.
Use a multicycle exception only for a transfer that really gets extra cycles.
By default the setup check uses the next capture edge at 10 ns.|l 96 49 96 158;l 312 49 312 158;l 529 49 529 158;a 98 106 310 106 default;t 96 179 0 ns;t 312 179 10 ns;t 529 179 20 ns
Use the second edge for setup on a path proven to transfer every two cycles.|l 96 49 96 158;l 312 49 312 158;l 529 49 529 158;a 98 105 526 105 multicycle;t 96 179 0 ns;t 312 179 10 ns;t 529 179 20 ns
If the circuit really captures at 10 ns, moving the deadline can hide a real failure.|e 184 78 272 69 Real 10 ns capture missed

Generated clock
A generated clock is a derived clock with a known relationship to a parent clock. A divider can produce one cycle for every two parent cycles.
Timing between parent and derived domains needs the relationship between their edges.
create_generated_clock -name div2 -source [get_ports clk] -divide_by 2 [get_pins u_div/Q]
The clock originates from clk and is defined on the divider's Q pin. Its period is twice the parent period.
Check the source, target, ratio and phase against the implemented logic.
Derive generated-clock edges from the source and analyze paths with the related clock waveforms.
A generated clock inherits a known edge relationship.
Mark the parent clock edges.|w 66 87 126 87 126 42 239 42 239 87 352 87 352 42 465 42 465 87 578 87 578 42;t 313 26 Parent
Show div2 completing one cycle during two parent cycles.|w 66 87 126 87 126 42 239 42 239 87 352 87 352 42 465 42 465 87 578 87 578 42;w 66 161 126 161 126 115 352 115 352 161 578 161 578 115;t 308 190 Divided by 2
A wrong ratio gives the analyzer the wrong capture edges for paths between the domains.|e 130 111 381 58 Wrong generated-clock period
`),
chapter('DEF', 'demo.def', lef, `
Database units
DEF stores physical positions as integers called database units (DBU). A scale factor converts them to micrometres.
Integer coordinates preserve consistent positions when exchanging design data between tools.
UNITS DISTANCE MICRONS 1000 ;
There are 1000 DBU per micrometre, so coordinate 2500 means 2.5 µm.
Verify the readback scale and compare die and macro dimensions with LEF after conversion.
Scale imported coordinates into the internal database units.
Divide DEF database units by the scale to get micrometres.
Locate 2500 on the integer coordinate axis.|a 88 110 550 110 DBU;l 389 72 389 154;t 389 169 2500 DBU
Divide by 1000 to get the physical coordinate.|b 56 77 158 61 2500 DBU;a 215 107 425 107 divide by 1000;g 428 77 157 61 2.5 µm
A tenfold scale mistake places objects far from their intended physical locations.|e 170 77 295 61 Incorrect: 25 µm

DIEAREA
DIEAREA gives the design boundary. It describes the outline of the die or block in its own coordinates.
Tools use that boundary to define the design's physical extent and detect objects outside it.
UNITS DISTANCE MICRONS 1000 ;~DIEAREA ( 0 0 ) ( 100000 80000 ) ;
This rectangle spans 100 µm by 80 µm. Placement rows can occupy a smaller region inside it.
Compare outline coordinates with the floorplan and check whether rows and pins fit.
Construct a polygon or rectangle from the specified coordinates.
DIEAREA outlines the physical design.
Mark the lower-left and upper-right coordinates.|g 152 169 10 10;g 472 36 10 10;t 156 200 (0, 0);t 479 25 (100, 80) µm
Construct the die rectangle between the points.|b 157 42 319 131 Die boundary;t 320 199 Width 100 µm · height 80 µm
A too-small boundary can leave a placed macro outside the die.|b 157 42 319 131;e 431 85 135 62 Outside die

Placement rows and tracks
Rows describe legal placement slots for cells. Tracks describe repeated candidate routing coordinates for wires.
The placer and router need distinct grids. Aligning cells to rows alone does not guarantee that wires can access their pins.
ROW r0 coreSite 0 1000 N DO 20 BY 1 STEP 200 0 ;~TRACKS X 100 DO 24 STEP 200 LAYER M2 ;
The row begins at (0,1000) DBU and repeats sites along X. TRACKS X gives varying X coordinates for vertical M2 lines.
Check row site and orientation, track pitch and offset, and whether pins are reachable.
Build a placement grid from ROW and a separate routing grid from TRACKS.
Rows organize cells. Tracks organize possible wire positions.
Create the row by repeating the placement site.|b 120 105 80 60;b 200 105 80 60;b 280 105 80 60;b 360 105 80 60;b 440 105 80 60;t 323 188 Placement sites
Overlay vertical M2 tracks at repeated X coordinates.|b 120 105 400 60;l 160 39 160 173;l 240 39 240 173;l 320 39 320 173;l 400 39 400 173;l 480 39 480 173;t 323 194 M2 track step · 200 DBU
A bad track offset can move the only nearby candidate off the pin.|g 227 107 26 25 Pin;l 287 42 287 170;e 350 80 207 56 Track misses pin

Components, placement and orientation
A component record associates an instance name with a master and can place that instance at a design coordinate and orientation.
The same netlist can have many physical layouts. Placement information tells the tools which layout to load.
COMPONENTS 1 ;~  - u1 INV_X1 + PLACED ( 4000 3000 ) N ;~END COMPONENTS
u1 is an inverter at (4000,3000) DBU with normal orientation N. A FIXED component has stronger movement restrictions than PLACED.
Check master match, status, row legality and actual position and orientation of pins.
Instantiate or update the physical component, transforming its footprint and pins to the given location.
A component record says which cell is where and how it is oriented.
Start with the design axes and an empty row.|l 79 167 559 167;l 79 167 79 38;b 83 103 469 54 Placement row
Move u1 along the row by changing the X coordinate. Its pin moves with it.|l 79 167 559 167;l 79 167 79 38;b 83 103 469 54;g $placed 104 82 52 u1;g $pin 134 9 10;t 320 194 $defPosition
A placement overlapping another component requires correction or review of the imported coordinates.|b 104 99 195 56 u1;e 258 99 195 56 u2 · overlap

Top-level pins
A DEF pin records the external physical terminal of a design and can give it metal geometry and a position.
A wire entering or leaving a block needs a real landing that the next level of design can reach.
PINS 1 ;~  - din + NET din + DIRECTION INPUT + USE SIGNAL~    + LAYER M2 ( -50 -50 ) ( 50 50 )~    + FIXED ( 0 10000 ) N ;~END PINS
din belongs to net din and has an M2 rectangle relative to its fixed location.
Check port names, edge location, layer, direction and compatibility with the higher-level connection.
Create the block terminal, its pin shape, and its net association.
A DEF pin gives the block interface a real landing.
Locate the left boundary and fix din at y = 10000 DBU.|b 198 46 335 124 Block;g 186 98 30 30 din;t 111 145 y = 10000 DBU
Bring an external M2 wire onto the pin shape.|b 198 46 335 124 Block;g 186 98 30 30 din;a 55 113 185 113 External M2
A wrong layer can leave the parent wire physically disconnected.|b 198 46 335 124 Block;e 186 98 30 30 M1;a 55 113 164 113 M2;t 322 189 No via between layers

Nets and routed geometry
DEF can record connected terminals and the wire geometry that joins them in a particular physical design.
Saving the route lets another tool analyze the same wires and detect geometric or connectivity problems.
NETS 1 ;~  - n1 ( u1 Y ) ( u2 A )~    + ROUTED M1 ( 4000 3000 ) ( 9000 * ) ;~END NETS
u1.Y and u2.A share n1. The M1 segment runs to x = 9000 DBU while * repeats the previous y.
Confirm endpoints, layer transitions and whether placed routes match the intended net.
Load conductive segments, associate them with the net and verify physical connectivity.
DEF can store endpoints and the metal that actually joins them.
Identify the driver and receiver pins connected by n1.|b 67 81 152 59 u1.Y;b 424 81 152 59 u2.A
Draw the horizontal M1 route between the example locations.|b 67 81 152 59 u1.Y;a 220 111 422 111 M1 · n1;b 424 81 152 59 u2.A;t 322 171 Constant y = 3000 DBU
A truncated segment leaves an open at the destination.|b 67 81 152 59 u1.Y;a 220 111 325 111 M1;e 424 81 152 59 u2.A · open

Blockages
A placement blockage or routing blockage reserves an area for a particular physical purpose.
Some regions must stay empty for macro interfaces, existing metal or other floorplan requirements.
BLOCKAGES 1 ;~  - PLACEMENT RECT ( 4000 3000 ) ( 8000 6000 ) ;~END BLOCKAGES
This rectangle restricts placement, with corners expressed in DBU.
Check whether it affects placement or routing, and verify its area and layers if applicable.
Apply the blockage to candidate placements or routes governed by that blockage.
Blockages reserve room by restricting placement or routing.
Mark the reserved region in a row.|l 68 140 574 140;e 253 65 139 80 Placement blockage
Place the cell in an available region beside the blockage.|l 68 140 574 140;e 253 65 139 80 Placement blockage;g 411 88 119 52 u1
A missing blockage can allow placement in the reserved region.|e 253 65 139 80 Reserved region;g 274 92 94 48 u1;t 324 187 Illegal overlap
`),
chapter('UPF', 'demo.upf', 'https://www.accellera.org/images/resources/videos/UPF_for_Low_Power_2014.pdf', `
Power domains
A power domain groups design elements that share a power policy. One block can shut down while another stays powered.
Tools need to know which instances share supplies and where special boundary behavior is required.
create_power_domain PD_CPU -elements {u_cpu}~create_power_domain PD_AON -elements {u_ctrl}
u_cpu joins PD_CPU and u_ctrl joins PD_AON. Other declarations bind supplies and define their states.
Check the scope and completeness of the instance membership, including nested domains.
Associate design elements with a supply policy and analyze crossings between policies.
A power domain groups elements with a shared power policy.
Identify the CPU and controller instances.|b 69 75 201 65 u_cpu;b 369 75 201 65 u_ctrl
Group each instance under its policy. In this example only the CPU is switchable.|e 69 75 201 65 PD_CPU · off;g 369 75 201 65 PD_AON · on
A controller assigned to the switchable domain may lose power when it is needed to wake the chip.|e 104 75 434 65 Controller shuts down with CPU

Supply ports, nets and power switches
Supply ports expose electrical supply connections. Supply nets carry those supplies. A power switch can connect or disconnect the supply to a domain.
A switchable block needs a physically distinct switched supply so that another domain can remain on.
create_supply_port VDD~create_supply_net VDD~connect_supply_net VDD -ports VDD~create_supply_net VDD_CPU -domain PD_CPU~create_power_switch SW_CPU -domain PD_CPU -input_supply_port {VIN VDD} -output_supply_port {VOUT VDD_CPU} -control_port {EN cpu_en} -on_state {RUN VIN {EN}}
VDD connects to the switch input. EN controls whether the switch delivers VDD to the switched net VDD_CPU.
Verify the supply connectivity, switch control polarity and that always-on loads use the correct upstream supply.
Represent switched supply connectivity and map or verify a compatible implementation.
A switch controls whether the switched supply is connected.
Close the switch with EN = 1 so the CPU supply is live.|b 54 81 118 55 VDD;a 172 108 240 108;g 242 81 146 55 SW_CPU · on;a 390 108 467 108;b 468 81 123 55 VDD_CPU
Open the switch with EN = 0. The upstream supply remains on.|b 54 81 118 55 VDD;a 172 108 240 108;e 242 81 146 55 SW_CPU · off;b 468 81 123 55 VDD_CPU;t 525 164 Power removed
Shorting VDD_CPU to VDD bypasses the switch and defeats power gating.|b 54 81 118 55 VDD;a 174 108 468 108 Bypass;e 468 81 123 55 VDD_CPU

Isolation
An isolation cell clamps signals from a domain that can lose power to a known value before they reach a still-active receiver.
An unpowered gate output cannot provide a reliable logic value to powered logic.
set_isolation ISO_CPU -domain PD_CPU -applies_to outputs -clamp_value 0 -isolation_signal iso_en -isolation_sense high -location parent
The strategy controls outputs of PD_CPU and clamps to zero when iso_en is high. Parent-side placement and supply must support operation during shutdown.
Check crossing direction, clamp value, control sequence and availability of an always-on supply.
Identify affected crossings and implement or check an isolation cell matching the strategy.
Isolation gives a powered receiver a known value during shutdown.
While the CPU is on, isolation passes the output normally.|b 50 78 157 61 CPU · 1;a 208 109 244 109;b 246 78 148 61 ISO · pass;a 396 109 432 109;b 434 78 156 61 Receiver · 1
Assert isolation before shutting off the CPU. The receiver sees a known 0.|e 50 78 157 61 CPU · off;a 208 109 244 109;g 246 78 148 61 ISO · clamp;a 396 109 432 109;b 434 78 156 61 Receiver · 0
Without isolation, the active receiver can see an unknown output.|e 50 78 157 61 CPU · off;a 208 109 432 109 Unknown;e 434 78 156 61 Receiver · X

Retention
Retention preserves selected state across a controlled power-down, usually with a separate supply for the state-holding portion of a retention cell.
Switching a block off can lose the current state. Preserving selected registers avoids a full restart when the block wakes.
set_retention RET_CPU -domain PD_CPU -elements {u_state} -retention_supply_set PD_AON.primary~set_retention_control RET_CPU -domain PD_CPU -save_signal {save high} -restore_signal {restore high}
The strategy retains u_state using the always-on primary supply set in this example. Control signals indicate when to save and restore.
Check the register list, retention supply and save/restore ordering against the power controller.
Map selected state to a retention-capable design and verify power-state behavior.
Retention saves state through shutdown so it can be restored.
Save state 1 while the main supply is still on.|b 71 77 173 60 u_state · 1;a 246 108 409 108 SAVE;g 412 77 169 60 Retained · 1
During shutdown the retention store stays powered. After wake-up restore the value to the live register.|g 71 77 173 60 Restored · 1;a 408 108 246 108 RESTORE;g 412 77 169 60 Retained · 1
Saving too late or losing the retention supply leaves no reliable state to restore.|e 71 77 173 60 u_state · X;e 412 77 169 60 Saved state lost

Level shifting
A level shifter translates a logic signal between domains that use different voltage levels.
A voltage suitable for one domain may not reliably drive the other or may exceed its electrical limits.
set_level_shifter LS_CPU -domain PD_CPU -applies_to outputs -rule low_to_high -location parent
The strategy selects low-to-high output crossings. The tool uses domain supply information and available cells to implement them.
Check source and destination voltages, crossing direction, and cell supply connectivity.
Identify crossings requiring conversion and insert or validate a compatible shifter.
Level shifting makes a signal usable at the receiver’s voltage.
Identify a signal traveling from the 0.72 V domain to a 0.90 V domain.|b 50 78 178 61 CPU · 0.72 V;b 418 78 172 61 AON · 0.90 V
Insert a low-to-high shifter to produce a logic level suitable for the receiver.|b 50 78 178 61 0.72 V;a 229 108 262 108;g 264 78 112 61 Shifter;a 377 108 416 108;b 418 78 172 61 0.90 V
An unshifted high may be below the receiving domain's reliable high level.|b 50 78 178 61 0.72 V;a 229 108 416 108;e 418 78 172 61 High level uncertain

Power states and sequencing
A power state names a supply condition such as on or off. A shutdown sequence is the order in which control signals protect the design while it changes state.
A powered neighbor needs valid signals throughout shutdown and wake-up. Power-aware verification checks whether the controller obeys the intended sequence.
add_power_state PD_CPU.primary -state {ON -supply_expr {power == {FULL_ON 0.72}}}~add_power_state PD_CPU.primary -state {OFF -supply_expr {power == {OFF}}}
ON describes the primary power function at 0.72 V. OFF describes that function being switched off. The controller implements the actual transition sequence.
Check that valid supply states are represented and that save, isolate, switch and restore controls are sequenced correctly.
Evaluate declared supply conditions during power-aware simulation or analysis and report unintended operation in an off state.
Name the supply states and protect crossings before switching power.
Recognize the live supply at 0.72 V.|g 143 78 349 62 ON · 0.72 V
Isolate the outputs, then disconnect the main supply.|g 55 78 185 62 Isolation asserted;a 242 108 398 108 then;e 401 78 179 62 OFF · supply open
Switching off before isolation lets an unknown signal reach the powered neighbor.|e 61 77 176 62 Already OFF;a 239 107 401 107 X escapes;e 404 77 175 62 Neighbor sees X
`),
chapter('RC Technology & SPEF', 'demo.spef', 'https://openroad.readthedocs.io/en/latest/main/src/rcx/README.html', `
Extraction rules and RC corner
A resistance-capacitance (RC) technology model gives an extractor calibrated electrical data for interconnect shapes at a process corner.
The same logical net can use different layers, lengths and surroundings. Timing needs the electrical effects of the actual shapes.
Metal 1 UNDER 5~DIST count 12 width 0.17~0.17 9.04461e-05 1.542e-05 0.0454914~0.34 5.11459e-05 1.92353e-05 0.0454914
This abridged Sky130 OpenRCX table selects a layer context with metal 1 under metal 5 and a width of 0.17 µm. The 12-sample block begins with rows for 0.17 µm and 0.34 µm spacing, followed by the model’s coupling, ground capacitance and resistance coefficients. A flow loads the rules using set_extraction_rules_file.
Check model revision, process, corner, layer stack and extractor compatibility.
Use model tables and routed context to create parasitic resistors and capacitors.
Use rules for the right process to turn geometry into an RC network.
Read the length and neighboring conductors of a routed M1 segment.|b 105 67 431 34 Neighbor;b 105 125 431 39 Target wire
Use the calibrated layer and geometry context to build the net's electrical model.|b 55 74 181 62 Geometry;a 237 105 402 105 RC rules;g 405 74 180 62 R + C network
A model for another stack can systematically understate or overstate extracted parasitics.|e 115 74 411 66 Wrong stack or RC corner

Wire resistance
Resistance measures how strongly a conductor opposes current. Units are ohms (Ω).
A long or narrow wire usually has higher resistance. Together with capacitance, it slows the signal along the wire.
*R_UNIT 1 OHM~*RES~1 n1:1 n1:2 12.5
In a SPEF net excerpt, resistor 1 is 12.5 Ω between n1:1 and n1:2.
Compare long routes and layer choices with plausible extracted resistance.
Represent each extracted section as a resistance and solve its effect on delay.
Resistance in a wire changes how quickly a signal travels.
Identify one wire segment between two internal nodes.|b 84 88 472 46 M1 wire;t 98 164 n1:1;t 547 164 n1:2
Replace the segment in the electrical model with its extracted 12.5 Ω resistor.|w 89 111 213 111 235 89 264 135 293 89 322 135 351 89 380 135 405 111 552 111;t 320 171 12.5 Ω
Omitting resistance can make a long routed connection look unrealistically fast.|l 89 111 552 111;t 322 155 Inaccurate model · 0 Ω

Ground and coupling capacitance
Ground capacitance models stored charge relative to a reference. Coupling capacitance represents electrical interaction between two conductors.
Both contribute to delay. Coupling can also let one switching wire disturb a nearby wire.
*C_UNIT 1 FF~*CAP~1 n1:1 2.0~2 n1:1 n2:1 1.0
In this SPEF excerpt, entry 1 is ground capacitance and entry 2 is a capacitor between nodes on distinct nets.
Check units, coupling extraction settings and sensitive neighbors.
Load the ground and coupling capacitors and handle coupling according to the analysis model.
Capacitance connects a signal electrically to ground or its neighbors.
Model capacitance from the signal wire to ground.|b 103 53 435 32 n1;a 321 86 321 154 2.0 fF to ground;l 119 159 524 159
Add a nearby switching net and model coupling between the two signals.|b 103 45 435 32 n1;a 321 78 321 131 1.0 fF coupling;b 103 132 435 32 n2
Omitted coupling can hide a potential disturbance from a nearby switching wire.|b 103 46 435 32 Switching neighbor;e 103 132 435 32 Victim · effect missing

SPEF annotation
SPEF carries the extracted electrical network for individual routed nets. Timing annotation matches those records to the current design.
Timing can use actual routed parasitics instead of estimates only when the net names and revision match.
*D_NET n1 3.0~*CONN~*I u1:Y O~*I u2:A I~*END
This net excerpt identifies n1, gives its total capacitance in the file's units and lists connected instance terminals. CAP and RES groups would carry the detailed network.
Check revision, hierarchy separators, units and the report of nets with missing annotation.
Resolve SPEF terminals and attach parasitics to the corresponding net in the timing graph.
SPEF must match the design to annotate extracted parasitics.
Find n1 and its two terminals in the netlist.|b 62 81 144 55 u1:Y;a 208 107 426 107 n1;b 429 81 148 55 u2:A
Match the SPEF n1 record and attach its extracted network.|g 226 40 190 50 SPEF · n1;a 320 92 320 130;b 115 133 412 48 Timing graph · n1 annotated
If the report shows missing annotation, the path may still use incomplete data or estimates.|e 127 78 389 62 Extracted net could not be matched
`),
chapter('MMMC', 'timing_scenes.tcl', sta, `
Modes and constraint sets
A mode is a way the chip operates. Normal operation and factory scan testing can use different clocks, port delays and active paths.
A single SDC cannot describe conflicting assumptions simultaneously, so each mode receives its own constraints.
read_sdc -mode func func.sdc~read_sdc -mode scan scan.sdc
These OpenSTA mode commands associate one SDC with regular operation and another with scan.
Check clock definitions, mode pins, active paths and constraint coverage for each mode.
Build separate timing constraints and derive the paths relevant to each mode.
Each operating mode has its own timing assumptions.
Use func.sdc for normal operation.|b 71 76 191 62 Design;a 264 107 423 107 normal;g 425 76 149 62 func.sdc
Select scan.sdc for test behavior while using the same design.|b 71 76 191 62 Design;a 264 107 423 107 scan;g 425 76 149 62 scan.sdc
If the scan mode is missing, test-only timing requirements can go unchecked.|e 135 77 369 64 Scan clock not analyzed

Library and parasitic corner data
A timing corner combines characterized cell behavior and interconnect parasitics for particular analysis assumptions.
Cell delay and wire delay vary for different reasons. Pair the models using the technology release's approved combinations.
read_liberty slow.lib~read_spef -name rc_max demo_rc_max.spef
This loads a Liberty library and names one set of extracted parasitics for use by an analysis scene.
Check that library voltage, temperature, process and SPEF extraction corner match the intended scenario.
Assign each data model to the proper setup or hold evaluation when configuring the scene.
Pair cell and wiring models for the required corner.
Identify the cell timing model for an example corner.|b 57 70 174 63 slow.lib;a 233 101 403 101 cell delay;b 406 70 174 63 Corner data
Attach the matching parasitics model to represent wire delay as well.|b 57 42 174 49 slow.lib;b 57 132 174 49 rc_max SPEF;a 233 67 402 102;a 233 155 402 114;g 405 78 179 61 Corner data
A mismatched pairing can omit a required pessimistic combination or create unrealistic estimates.|e 132 73 377 68 Incorrect model pairing

Analysis scenes
An analysis scene represents a specific mode and set of corner data. Implementation teams choose a set of scenes to cover timing requirements.
A single passing timing report does not establish that every operating condition passes.
define_scene func_slow -mode func -liberty slow.lib -spef rc_max~report_checks -scenes {func_slow}
This OpenSTA example selects mode func and the slow cell model with named rc_max parasitics. Other scenes can use separate min and max data.
Check required scene coverage, enabled checks, and the worst slack for each scene.
Build and report timing using the associated mode constraints and parasitic and cell timing data.
A timing scene checks a mode with its assigned corner data.
Start with the mode and corner as independent choices.|b 63 78 168 61 func mode;b 411 78 168 61 slow + rc_max
Combine the choices into the func_slow scene and analyze it.|b 54 40 167 52 func mode;b 54 132 167 52 slow + rc_max;a 222 67 387 109;a 222 157 387 112;g 390 80 190 63 func_slow
An omitted required scene leaves that mode and corner combination without a checked timing result.|e 156 74 335 69 Required scene absent
`),
chapter('Think Like a PD Engineer', 'release_check.tcl', sta, `
Match the same cell across three files
A tool can know one cell by three views. The netlist names the copy used in this design. The cell LEF describes the physical shape of its master. Liberty describes the master’s electrical behavior.
A name can exist in one view and be missing in another. Linking the names first saves time because a tool cannot correctly place or time a cell with an unresolved view.
INV_X1 u1 (.A(a), .Y(n1));~MACRO INV_X1~  PIN A~cell (INV_X1) {~  pin (A) { direction : input; }
These lines come from Verilog, cell LEF and Liberty, respectively. Trace u1 to INV_X1, then find pin A under the same master in both library views.
Start from the exact failure message. Verify the selected design top, the master and pin spelling, and the library release. If the mismatch is real, use a consistent release and reload.
Resolve instance and pin names against the available master views. Depending on the missing view or stage, report an unresolved reference or missing physical or timing data.
Join the views by master and pin name before trusting the result.
Start at u1 in the netlist and read the master name.|b 176 75 289 62 Netlist · u1 uses INV_X1
Find INV_X1 and A in the layout and electrical views.|b 212 29 216 48 Netlist · INV_X1/A;a 289 78 155 120;a 351 78 485 120;g 52 121 206 54 LEF · INV_X1/A;g 383 121 206 54 Liberty · INV_X1/A
A mismatched LEF name stops the physical join. Check the release before attempting to route.|b 54 78 220 60 Netlist · INV_X1/A;a 276 108 366 108;e 370 78 217 60 LEF · pin B only

Investigate an off-grid or blocked pin
A routing track is a candidate line for a wire. A pin has usable access only where a wire or via can land on its metal and clear nearby obstacles. The answer depends on the placed instance and its neighbors.
A pin can look reachable on the drawing of the master by itself, yet fail after placement rotates or moves it near another cell. Checking all the views explains what the router sees.
PIN A~  PORT~    LAYER M1 ; RECT 0.10 0.20 0.18 0.35 ;~  END~END A~TRACKS Y 250 DO 20 STEP 240 LAYER M1 ;
The LEF excerpt defines local M1 pin metal in µm. The DEF tracks use database units. Convert units and use the component's DEF location and orientation before overlaying them.
Get the failing endpoint and layer from the routing report. Compare the placed LEF rectangle with DEF tracks. Then check nearby obstructions and Tech LEF spacing and via enclosure rules.
Transform the pin into design coordinates, find candidate connections on routing tracks, and eliminate candidates that fail the geometric rules.
Move from the reported pin to its actual geometry, then test the available approach.
Find the placed M1 pin and one route candidate on the same layer.|g 267 75 113 81 Pin A;l 75 115 558 115;t 320 183 Candidate M1 track
Trace the candidate from the source and check if it touches the pin.|g 267 75 113 81 Pin A;l 75 115 558 115;a 83 115 265 115 Legal approach
A neighboring obstruction blocks this entry. Check another track or a legal via rather than treating the pin as missing.|e 196 75 65 81 OBS;g 267 75 113 81 Pin A;a 82 115 191 115 Blocked;t 410 183 No legal landing on this approach

Read a failing setup report
A timing report compares when a signal arrives with when it is needed. Negative setup slack means this path reached its destination after the latest safe time under the selected assumptions.
The same symptom can come from slow logic, long wires, an incorrect clock constraint, or a mismatched analysis scene. The report tells you which path to investigate and the input files explain the numbers.
create_clock -name core_clk -period 10.0 [get_ports clk]~read_spef -name rc_max routed.spef~report_checks -scenes {func_slow} -path_delay max
SDC defines the clock. The extracted SPEF can explain wire delay. The report selects an analysis scene, which also needs its associated Liberty models and mode constraints.
Confirm the scenario and exact launch and capture points. Compare cell delays against Liberty, interconnect annotation against SPEF, and the deadline against SDC. Change the constraint only if it misstates the actual requirement, then rerun the check.
Compute path arrival and required times from the linked netlist, clock constraints, cell delays and available wire parasitics.
Verify the timing assumptions first. Then find which part of the path consumed the time.
Start with a report showing a 9.3 ns arrival and a 9.0 ns requirement.|e 123 75 394 65 Setup slack · −0.3 ns;t 320 170 9.0 ns required · 9.3 ns arrival
Trace the requirement to SDC, and the arrival to the cell and routed wire models.|b 49 67 163 66 SDC deadline;b 238 67 163 66 Liberty cells;b 427 67 163 66 SPEF wires;t 320 179 Confirm all three match the scene
Relaxing a correct clock merely makes the report look better. The real target still fails.|e 108 76 425 68 Requirement changed on paper;t 319 177 Actual capture deadline stays at 9.0 ns
`)
];
