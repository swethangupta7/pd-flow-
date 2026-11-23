import { DESIGNS, LAYERS, METALS, CELL_CLASSES, OVERLAYS } from './pdk.js';
import { STAGES, STAGE_BY_ID } from './content/index.js';
import { DEFAULT_PARAMS, METRIC_DEFS, computeState, stageVerdict, stageLog } from './engine.js';
import { DieView } from './render-core.js';
import './render-draw.js';
import './render-top.js';
import { Sfx } from './audio.js';
import { buildDeck } from './ui-controls.js';
import { renderBrief, renderQuiz, renderReports } from './ui-panes.js';
import { renderLearn, renderTools, renderProgress } from './ui-sections.js';

const $ = (id) => document.getElementById(id);
const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
const KEY = 'pd-flow-lab.v1';

const freshProgress = () => ({ xp: 0, runs: 0, tapeouts: 0, stages: {}, quiz: {}, verdicts: {} });

let progress = freshProgress();
let params = { ...DEFAULT_PARAMS };
let designId = DESIGNS[0].id;
let stageIdx = -1;          // -1 = nothing run yet
let selected = 0;           // stage being inspected
let state = null;
let verdicts = {};
let busy = false;
let runToken = 0;
let logLines = [];
let history = {};
let soundOn = true;

try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    progress = { ...freshProgress(), ...(saved.progress || {}) };
    params = { ...DEFAULT_PARAMS, ...(saved.params || {}) };
    if (DESIGNS.some((d) => d.id === saved.designId)) designId = saved.designId;
    soundOn = saved.soundOn !== false;
  }
} catch { /* private mode or corrupt storage — start fresh */ }

const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify({ progress, params, designId, soundOn })); } catch { /* ignore */ }
};

const sfx = new Sfx();
sfx.enabled = soundOn;

const view = new DieView($('die'), {
  onHover: (h) => {
    const card = $('hoverCard');
    if (!h) { card.hidden = true; return; }
    card.hidden = false;
    card.innerHTML = '';
    card.appendChild(el('h4', null, h.title));
    for (const [k, v] of h.rows) {
      const r = el('div');
      r.append(el('span', null, k), el('b', null, v));
      card.appendChild(r);
    }
  },
});

function toast(kind, title, msg) {
  const t = el('div', 'toast ' + kind);
  const body = el('div');
  body.append(el('b', null, title), document.createTextNode(' ' + msg));
  t.appendChild(body);
  $('toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '.3s'; }, 3600);
  setTimeout(() => t.remove(), 4000);
}

function pushLog(lines, head) {
  const host = $('log');
  if (host.querySelector('.log-empty')) host.innerHTML = '';
  if (head) {
    const h = el('div', 'log-line head');
    h.append(el('span', 'log-tag', '──'), el('span', 'log-msg', head));
    host.appendChild(h);
    logLines.push({ tag: '──', msg: head });
  }
  for (const l of lines) {
    const row = el('div', 'log-line ' + l.tag);
    row.append(el('span', 'log-tag', `[${l.tag}]`), el('span', 'log-msg', l.msg));
    host.appendChild(row);
    logLines.push(l);
  }
  host.scrollTop = host.scrollHeight;
  if (logLines.length > 900) {
    logLines = logLines.slice(-600);
    while (host.childElementCount > 600) host.removeChild(host.firstChild);
  }
}

function levelFor(xp) { return Math.floor(Math.sqrt(xp / 60)) + 1; }

function paintXP() {
  const lvl = levelFor(progress.xp);
  const base = 60 * (lvl - 1) ** 2;
  const next = 60 * lvl ** 2;
  $('xpLevel').textContent = 'L' + lvl;
  $('xpNum').textContent = progress.xp + ' XP';
  $('xpFill').style.width = Math.min(100, ((progress.xp - base) / (next - base)) * 100) + '%';
}

function awardXP(n, why) {
  const before = levelFor(progress.xp);
  progress.xp += n;
  const after = levelFor(progress.xp);
  paintXP();
  if (after > before) { toast('ok', `Level ${after}`, 'You can explain more of the flow now.'); sfx.pass(); }
  else if (why) toast('info', `+${n} XP`, why);
  save();
}

function recompute(reveal = false) {
  state = computeState(designId, params, stageIdx);
  view.setState(state, reveal);
  for (const s of STAGES) {
    if (verdicts[s.id]) verdicts[s.id] = stageVerdict(s.id, state);
  }
  paintMetrics();
  paintRail();
  paintReports();
  paintStageHeader();
}

function paintStageHeader() {
  const s = STAGES[selected];
  $('stageChip').textContent = s.short;
  $('stageChip').style.color = s.color;
  $('stageChip').style.borderColor = s.color + '66';
  $('stageChip').style.background = s.color + '22';
  $('viewerTitle').textContent = stageIdx < 0 ? `${s.name} — not run yet` : `${s.name} · ${state.design.name}`;
  $('railCount').textContent = `${Object.keys(verdicts).length} / 9`;
}

function paintRail() {
  const host = $('stageList');
  if (!host.childElementCount) {
    STAGES.forEach((s, i) => {
      const li = el('li', 'stage');
      li.dataset.id = s.id;
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      const dot = el('span', 'sdot');
      const name = el('span', 'sname');
      name.append(document.createTextNode(s.name), el('i', null, s.tool));
      li.append(dot, name, el('span', 'snum', String(s.n).padStart(2, '0')));
      const pick = () => { selected = i; paintRail(); paintStageHeader(); showBrief(); showQuiz(); sfx.click(); };
      li.addEventListener('click', pick);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      host.appendChild(li);
    });
  }
  [...host.children].forEach((li, i) => {
    const s = STAGES[i];
    const v = verdicts[s.id];
    li.classList.toggle('on', i === selected);
    li.classList.toggle('done', !!v && v.ok);
    li.classList.toggle('fail', !!v && !v.ok);
    li.classList.toggle('run', busy && i === stageIdx + 1);
    li.title = v ? v.msg : 'Not run yet';
  });
}

function paintMetrics() {
  const host = $('metrics');
  if (!host.childElementCount) {
    for (const d of METRIC_DEFS) {
      const c = el('div', 'metric');
      c.dataset.id = d.id;
      c.title = d.hint;
      c.append(el('div', 'ml', d.label));
      const v = el('div', 'mv');
      v.append(el('span', 'num', '—'), el('span', 'mu', d.unit));
      c.appendChild(v);
      const cv = document.createElement('canvas');
      cv.className = 'spark'; cv.width = 220; cv.height = 32;
      c.appendChild(cv);
      host.appendChild(c);
    }
  }
  for (const d of METRIC_DEFS) {
    const c = host.querySelector(`[data-id="${d.id}"]`);
    const val = state ? state.metrics[d.id] : 0;
    const active = stageIdx >= 0;
    const num = c.querySelector('.num');
    const txt = active ? d.fmt(val) : '—';
    if (num.textContent !== txt) {
      num.textContent = txt;
      c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    }
    c.classList.remove('good', 'warn', 'bad');
    if (active) c.classList.add(d.good(val, params) ? 'good' : d.warn(val, params) ? 'warn' : 'bad');
    if (active) {
      const h = (history[d.id] ||= []);
      if (h[h.length - 1] !== val) { h.push(val); if (h.length > 40) h.shift(); }
      drawSpark(c.querySelector('.spark'), h, d, val);
    }
  }
}

function drawSpark(cv, h, d, val) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  if (h.length < 2) return;
  const min = Math.min(...h), max = Math.max(...h);
  const span = max - min || 1;
  const col = d.good(val, params) ? '#34d399' : d.warn(val, params) ? '#f5a524' : '#ff3b30';
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  h.forEach((v, i) => {
    const x = (i / (h.length - 1)) * (W - 4) + 2;
    const y = H - 3 - ((v - min) / span) * (H - 8);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
  ctx.globalAlpha = 0.16;
  ctx.lineTo(W - 2, H); ctx.lineTo(2, H); ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  ctx.globalAlpha = 1;
}

function paintLayers() {
  const host = $('layerBar');
  host.innerHTML = '';
  for (const l of LAYERS) {
    const b = el('button', 'ltog' + (view.layers.has(l.id) ? ' on' : ''), '');
    b.type = 'button';
    b.title = l.hint;
    b.setAttribute('aria-pressed', String(view.layers.has(l.id)));
    const dot = el('i'); dot.style.background = l.color; dot.style.color = l.color;
    b.append(dot, el('span', null, l.label));
    b.style.borderColor = view.layers.has(l.id) ? l.color + '77' : '';
    b.addEventListener('click', () => {
      view.setLayer(l.id, !view.layers.has(l.id));
      paintLayers(); sfx.tick();
    });
    host.appendChild(b);
  }
}

function paintLegend() {
  const host = $('legend');
  host.innerHTML = '';
  const add = (color, label, dash) => {
    const s = el('span');
    const i = el('i');
    i.style.background = dash ? `repeating-linear-gradient(90deg,${color} 0 ${dash[0]}px,transparent ${dash[0]}px ${dash[0] + dash[1]}px)` : color;
    s.append(i, el('span', null, label));
    host.appendChild(s);
  };
  if (params.overlay !== 'none') {
    const o = OVERLAYS.find((x) => x.id === params.overlay);
    add('#22d3ee', `${o.label}: low`);
    add('#f5a524', 'medium');
    add('#ff3b30', 'high');
  }
  if (view.layers.has('routes')) for (const m of METALS.slice(1, params.layers + 1)) add(m.color, m.name + ' ' + m.dir, m.dash.length ? m.dash : null);
  if (view.layers.has('cells')) for (const c of CELL_CLASSES.slice(0, 4)) add(c.color, c.label);
  if (view.layers.has('viol')) { add('#ff3b30', 'DRC ✕'); add('#fb7185', 'setup ○'); add('#f5a524', 'antenna △'); }
}

let activeTab = 'console';
function setTab(name) {
  activeTab = name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
  document.querySelectorAll('.tab-pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + name));
  if (name === 'brief') showBrief();
  if (name === 'quiz') showQuiz();
  if (name === 'reports') paintReports();
}

function showBrief() {
  if (activeTab !== 'brief') return;
  renderBrief($('brief'), STAGES[selected], stageIdx >= selected ? state : null);
}
function showQuiz() {
  if (activeTab !== 'quiz') return;
  renderQuiz($('quiz'), STAGES[selected], progress, (sid, qi, correct, pick) => {
    const rec = (progress.quiz[sid] ||= { answers: {}, pick: {} });
    rec.pick ||= {};
    const first = rec.answers[qi] === undefined;
    rec.answers[qi] = correct;
    rec.pick[qi] = pick;
    sfx.quiz(correct);
    if (first && correct) awardXP(25, `Correct answer on ${STAGE_BY_ID[sid].name}.`);
    save();
    paintProgress();
    const card = $('quiz').querySelector('.quiz-score');
    if (card) {
      const right = Object.values(rec.answers).filter(Boolean).length;
      card.querySelector('b').textContent = `${right}/${STAGE_BY_ID[sid].quiz.length}`;
    }
  });
}
function paintReports() {
  if (activeTab !== 'reports' || !state) return;
  renderReports($('reports'), state, verdicts, exportAs);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function runStage(idx, token) {
  const s = STAGES[idx];
  stageIdx = idx;
  selected = idx;
  $('runState').textContent = `running ${s.short}`;
  $('runState').className = 'run-state busy';
  paintRail();
  sfx.stageStart();
  $('stageFlash').classList.remove('go'); void $('stageFlash').offsetWidth; $('stageFlash').classList.add('go');
  recompute(true);
  await wait(params.animate ? 260 : 60);
  if (token !== runToken) return false;

  const lines = stageLog(s.id, state);
  const v = stageVerdict(s.id, state);
  verdicts[s.id] = v;
  progress.stages[s.id] = (progress.stages[s.id] || 0) + 1;
  progress.runs = (progress.runs || 0) + 1;
  pushLog(lines, `${s.n}. ${s.name}  ·  ${s.tool}`);
  pushLog([{ tag: v.ok ? 'ok' : 'err', msg: v.msg }]);

  if (v.ok) { sfx.pass(); awardXP(15, `${s.name} closed clean.`); }
  else { sfx.fail(); toast('warn', s.name + ' failed', v.msg + ' Adjust the controls and run it again.'); }

  if (s.id === 'signoff' && v.ok) {
    progress.tapeouts = (progress.tapeouts || 0) + 1;
    sfx.tapeout();
    toast('ok', 'TAPEOUT', `${state.design.name}.gds is clean. That is a full RTL-to-GDSII closure.`);
    awardXP(120, 'Full flow closed and signed off.');
  }
  progress.verdicts = verdicts;
  save();
  paintRail(); paintMetrics(); paintStageHeader(); paintProgress();
  showBrief(); showQuiz(); paintReports();
  $('runState').textContent = v.ok ? `${s.short} pass` : `${s.short} fail`;
  $('runState').className = 'run-state ' + (v.ok ? 'done' : 'busy');
  return true;
}

async function runNext() {
  if (busy) return;
  const next = stageIdx + 1;
  if (next >= STAGES.length) { toast('info', 'Flow complete', 'Reset to run it again, or change a control and re-run a stage.'); return; }
  busy = true;
  const token = ++runToken;
  setRunButtons();
  await runStage(next, token);
  busy = false;
  setRunButtons();
}

async function runAll() {
  if (busy) { runToken++; busy = false; setRunButtons(); $('runState').textContent = 'stopped'; $('runState').className = 'run-state'; return; }
  busy = true;
  const token = ++runToken;
  setRunButtons();
  let i = stageIdx + 1;
  if (i >= STAGES.length) { i = 0; stageIdx = -1; verdicts = {}; }
  for (; i < STAGES.length; i++) {
    const ok = await runStage(i, token);
    if (!ok || token !== runToken) break;
    await wait(params.animate ? 200 : 30);
  }
  busy = false;
  setRunButtons();
  if (token === runToken) {
    const failed = STAGES.filter((s) => verdicts[s.id] && !verdicts[s.id].ok);
    if (!failed.length) $('runState').textContent = 'flow clean';
    else { $('runState').textContent = `${failed.length} stage(s) failing`; toast('warn', 'Flow finished with failures', failed.map((f) => f.short).join(', ') + ' — fix the controls and re-run.'); }
    $('runState').className = 'run-state ' + (failed.length ? 'busy' : 'done');
  }
}

function setRunButtons() {
  $('runBtn').disabled = busy || stageIdx >= STAGES.length - 1;
  $('prevBtn').disabled = busy || stageIdx < 0;
  $('runAllBtn').textContent = busy ? 'Stop ■' : 'Run all ▶▶';
  $('runAllTop').textContent = busy ? 'Stop ■' : 'Run full flow';
}

function stepBack() {
  if (busy || stageIdx < 0) return;
  stageIdx--;
  selected = Math.max(0, stageIdx);
  verdicts = {};
  for (let i = 0; i <= stageIdx; i++) verdicts[STAGES[i].id] = stageVerdict(STAGES[i].id, computeState(designId, params, i));
  recompute(true);
  pushLog([{ tag: 'warn', msg: `Stepped back to ${stageIdx < 0 ? 'start' : STAGES[stageIdx].name}. Later stages invalidated.` }]);
  $('runState').textContent = stageIdx < 0 ? 'idle' : STAGES[stageIdx].short;
  $('runState').className = 'run-state';
  setRunButtons(); paintProgress(); showBrief(); showQuiz();
  sfx.click();
}

function resetFlow(quiet) {
  runToken++; busy = false;
  stageIdx = -1; selected = 0; verdicts = {}; history = {};
  recompute(true);
  setRunButtons();
  $('runState').textContent = 'idle';
  $('runState').className = 'run-state';
  $('log').innerHTML = '<div class="log-empty">Console cleared. Press “Run stage” to start the flow at RTL.</div>';
  logLines = [];
  document.querySelectorAll('.spark').forEach((c) => c.getContext('2d').clearRect(0, 0, c.width, c.height));
  paintProgress(); showBrief(); showQuiz();
  if (!quiet) { toast('info', 'Reset', 'Flow back to the start. Your XP and quiz answers are kept.'); sfx.click(); }
}

function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function exportAs(kind) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const base = `${state.design.name}_${stamp}`;
  if (kind === 'png') {
    view.cv.toBlob((b) => { if (b) { download(base + '_layout.png', b); toast('ok', 'Saved', 'Layout PNG downloaded.'); } }, 'image/png');
    return;
  }
  if (kind === 'log') {
    const txt = logLines.map((l) => `[${l.tag}] ${l.msg}`).join('\n');
    download(base + '_run.log', txt || 'no log yet', 'text/plain');
    toast('ok', 'Saved', 'Run log downloaded.');
    return;
  }
  const report = {
    design: state.design.name, generated: new Date().toISOString(),
    pdk: 'sky130A / sky130_fd_sc_hd', params,
    floorplan: { dieW: +state.fp.dieW.toFixed(2), dieH: +state.fp.dieH.toFixed(2), coreW: +state.fp.coreW.toFixed(2), coreH: +state.fp.coreH.toFixed(2), rows: state.fp.rows, sites: state.fp.sites },
    metrics: Object.fromEntries(Object.entries(state.metrics).map(([k, v]) => [k, +Number(v).toFixed(4)])),
    stages: STAGES.map((s) => ({ id: s.id, name: s.name, run: !!verdicts[s.id], pass: verdicts[s.id]?.ok ?? null, note: verdicts[s.id]?.msg ?? 'not run' })),
    progress: { xp: progress.xp, level: levelFor(progress.xp), runs: progress.runs, tapeouts: progress.tapeouts },
  };
  download(base + '_report.json', JSON.stringify(report, null, 2), 'application/json');
  toast('ok', 'Saved', 'JSON report downloaded.');
}

let deckRefs = {};
function onControl(key, value, committed) {
  params[key] = value;
  if (key === 'overlay' || key === 'quality' || key === 'grid' || key === 'glow' || key === 'animate') {
    recompute(false);
    paintLegend();
    if (committed) sfx.tick();
    save();
    return;
  }
  recompute(false);
  paintLegend();
  if (committed) { sfx.tick(); save(); }
  if (stageIdx >= 0) {
    const s = STAGES[stageIdx];
    const v = stageVerdict(s.id, state);
    verdicts[s.id] = v;
    paintRail();
    $('runState').textContent = v.ok ? `${s.short} pass` : `${s.short} fail`;
    $('runState').className = 'run-state ' + (v.ok ? 'done' : 'busy');
  }
  showBrief(); paintReports();
}

function randomise() {
  const r = (a, b, s = 1) => Math.round((a + Math.random() * (b - a)) / s) * s;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const next = {
    util: r(45, 80), aspect: r(0.7, 1.6, 0.05), margin: r(6, 22),
    macroMode: pick(['corners', 'auto', 'center']), halo: r(3, 14), channel: r(8, 32),
    strapPitch: r(20, 64, 2), strapW: r(2, 7, 0.5),
    density: r(0.42, 0.78, 0.01), effort: pick(['low', 'med', 'high']),
    clock: r(3.5, 14, 0.25), ctsLevels: r(1, 5), skewTarget: r(0.08, 0.3, 0.01),
    layers: r(2, 5), vtMix: r(0.1, 0.85, 0.05),
  };
  Object.assign(params, next);
  for (const [k, v] of Object.entries(next)) deckRefs[k]?.set(v);
  recompute(true); paintLegend(); save();
  toast('info', 'Randomised', 'New physical setup. Run the flow and see what breaks.');
  sfx.click();
}

function paintProgress() {
  renderProgress($('compList'), $('mastery'), $('statRow'), $('gloss'), progress);
}

// ── wiring ────────────────────────────────────────────────────────────────
const designSel = $('designSel');
for (const d of DESIGNS) {
  const o = document.createElement('option');
  o.value = d.id;
  o.textContent = `${d.name} — ${d.tag}`;
  designSel.appendChild(o);
}
designSel.value = designId;
const paintDesignNote = () => {
  const d = DESIGNS.find((x) => x.id === designId);
  $('designNote').textContent = `${d.note}  (${d.cells.toLocaleString()} cells · ${d.flops.toLocaleString()} flops · ${d.macros} macros)`;
};
designSel.addEventListener('change', () => {
  designId = designSel.value;
  const d = DESIGNS.find((x) => x.id === designId);
  params.clock = d.clock;
  deckRefs.clock?.set(d.clock);
  paintDesignNote();
  resetFlow(true);
  save();
  toast('info', d.name, 'Design loaded. Clock target set to ' + d.clock.toFixed(2) + ' ns.');
  sfx.click();
});

const overlaySel = $('overlaySel');
for (const o of OVERLAYS) {
  const opt = document.createElement('option');
  opt.value = o.id; opt.textContent = o.label; opt.title = o.hint;
  overlaySel.appendChild(opt);
}
overlaySel.value = params.overlay;
overlaySel.addEventListener('change', () => {
  params.overlay = overlaySel.value;
  deckRefs.overlay?.set(params.overlay);
  recompute(false); paintLegend(); save(); sfx.tick();
});

deckRefs = buildDeck($('deckScroll'), params, onControl);

$('runBtn').addEventListener('click', runNext);
$('runAllBtn').addEventListener('click', runAll);
$('runAllTop').addEventListener('click', () => { document.getElementById('lab').scrollIntoView({ behavior: 'smooth' }); runAll(); });
$('prevBtn').addEventListener('click', stepBack);
$('resetBtn').addEventListener('click', () => resetFlow(false));
$('randBtn').addEventListener('click', randomise);
$('defaultsBtn').addEventListener('click', () => {
  params = { ...DEFAULT_PARAMS, clock: DESIGNS.find((d) => d.id === designId).clock };
  for (const [k, v] of Object.entries(params)) deckRefs[k]?.set(v);
  overlaySel.value = params.overlay;
  recompute(true); paintLegend(); save();
  toast('info', 'Defaults restored', 'Back to the reference setup for this design.');
  sfx.click();
});
$('exportBtn').addEventListener('click', () => exportAs('json'));
$('pngBtn').addEventListener('click', () => exportAs('png'));
$('fitBtn').addEventListener('click', () => { view.fit(); sfx.tick(); });
$('clearLog').addEventListener('click', () => {
  $('log').innerHTML = '<div class="log-empty">Console cleared.</div>';
  logLines = [];
});
$('briefBtn').addEventListener('click', () => { setTab('brief'); $('pane-brief').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
$('quizBtn').addEventListener('click', () => { setTab('quiz'); $('pane-quiz').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { setTab(t.dataset.tab); sfx.click(); }));

const soundBtn = $('soundBtn');
const paintSound = () => {
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  $('soundLbl').textContent = soundOn ? 'Sound' : 'Muted';
  soundBtn.title = soundOn ? 'Sound on — click to mute everything' : 'Muted — click to turn sound on';
};
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  sfx.setEnabled(soundOn);
  paintSound(); save();
  if (soundOn) sfx.click();
});
paintSound();

$('wipeBtn').addEventListener('click', () => {
  progress = freshProgress();
  verdicts = {};
  save(); paintXP(); paintProgress(); paintRail(); showQuiz();
  toast('warn', 'Progress cleared', 'XP, quiz answers and stage records reset. Parameters kept.');
});

const learn = renderLearn($('learnNav'), $('learnBody'), (sid, tab) => {
  const i = STAGES.findIndex((s) => s.id === sid);
  selected = i;
  paintRail(); paintStageHeader();
  document.getElementById('lab').scrollIntoView({ behavior: 'smooth' });
  setTab(tab || 'brief');
  sfx.click();
}, 'floorplan');
renderTools($('toolGrid'), $('pdkNote'));

// nav current-section state
const sections = ['lab', 'learn', 'tools', 'progress'].map((id) => document.getElementById(id));
const navLinks = [...document.querySelectorAll('.nav a, .subnav a')];
const io = new IntersectionObserver((entries) => {
  const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!vis) return;
  navLinks.forEach((a) => a.classList.toggle('on', a.dataset.sec === vis.target.id));
}, { rootMargin: '-70px 0px -55% 0px', threshold: [0.05, 0.25, 0.5] });
sections.forEach((s) => io.observe(s));

// keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.key === 'r' || e.key === 'R') { e.preventDefault(); runNext(); }
  else if (e.key === 'a' || e.key === 'A') { e.preventDefault(); runAll(); }
  else if (e.key === 'f' || e.key === 'F') { view.fit(); }
  else if (e.key === 'm' || e.key === 'M') { soundBtn.click(); }
});

// ── boot ──────────────────────────────────────────────────────────────────
paintDesignNote();
paintLayers();
paintLegend();
paintXP();
paintProgress();
recompute(true);
setRunButtons();
$('log').innerHTML = '<div class="log-empty">Ready. Pick a design, set the controls, then press “Run stage” (R) or “Run all” (A).</div>';
pushLog([
  { tag: 'info', msg: `PD FLOW LAB · sky130A / sky130_fd_sc_hd · site 0.46 × 2.72 µm · met1..met5` },
  { tag: 'info', msg: `Design ${state.design.name}: ${state.design.cells.toLocaleString()} cells, ${state.design.flops.toLocaleString()} flops, ${state.design.macros} macros.` },
  { tag: 'info', msg: 'Shortcuts: R run stage · A run all · F fit view · M mute.' },
]);
view.start();
window.addEventListener('beforeunload', () => { save(); view.destroy(); });
document.addEventListener('visibilitychange', () => { document.hidden ? view.stop() : view.start(); });

// expose a tiny hook for automated checks
window.__lab = { get state() { return state; }, get params() { return params; }, get stageIdx() { return stageIdx; }, runAll, runNext, resetFlow, view, setTab, randomise };