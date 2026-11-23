import { STAGES } from './content/index.js';
import { METRIC_DEFS } from './engine.js';

const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

function cmdBlock(c) {
  const box = el('div', 'cmd');
  const h = el('div', 'cmd-h');
  h.appendChild(el('span', null, c.label));
  const b = el('button', 'copy-btn', 'copy');
  b.type = 'button';
  b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(c.code); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = c.code; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* clipboard unavailable */ }
      ta.remove();
    }
    b.textContent = 'copied'; b.classList.add('done');
    setTimeout(() => { b.textContent = 'copy'; b.classList.remove('done'); }, 1400);
  });
  h.appendChild(b);
  const pre = el('pre');
  pre.textContent = c.code;
  box.append(h, pre);
  return box;
}

function block(cls, title, items, ordered) {
  const b = el('div', 'b-block ' + cls);
  b.appendChild(el('h4', null, title));
  if (Array.isArray(items)) {
    const list = el(ordered ? 'ol' : 'ul');
    for (const t of items) list.appendChild(el('li', null, t));
    b.appendChild(list);
  } else b.appendChild(el('p', null, items));
  return b;
}

export function renderBrief(host, stage, state) {
  host.innerHTML = '';
  host.appendChild(el('h3', null, `${stage.n}. ${stage.name}`));
  host.appendChild(el('div', 'bsub', `${stage.tool}  ·  ${stage.dir}  ·  ${stage.summary}`));

  const io = el('div', 'io-row');
  const i = el('div'); i.appendChild(el('b', null, 'reads')); i.appendChild(el('span', null, stage.inputs.join(', ')));
  const o = el('div', 'out'); o.appendChild(el('b', null, 'writes')); o.appendChild(el('span', null, stage.outputs.join(', ')));
  io.append(i, o);
  host.appendChild(io);

  host.appendChild(block('work', '1 · Real work — what you actually do', stage.realWork));
  host.appendChild(block('circ', '2 · Inside the circuit', stage.circuit, true));
  host.appendChild(block('topic', '3 · The topic, simply', stage.topic));
  host.appendChild(block('keys', '4 · Remember these', stage.keys));

  const cb = el('div', 'b-block');
  cb.appendChild(el('h4', null, 'Commands you would really type'));
  for (const c of stage.commands) cb.appendChild(cmdBlock(c));
  host.appendChild(cb);

  const fb = el('div', 'b-block');
  fb.appendChild(el('h4', null, 'What goes wrong, and the fix'));
  const tbl = el('table', 'fail-tbl');
  tbl.innerHTML = '<thead><tr><th>Symptom</th><th>Cause</th><th>Fix</th></tr></thead>';
  const tb = el('tbody');
  for (const f of stage.failures) {
    const tr = el('tr');
    tr.append(el('td', null, f.symptom), el('td', null, f.cause), el('td', null, f.fix));
    tb.appendChild(tr);
  }
  tbl.appendChild(tb);
  fb.appendChild(tbl);
  host.appendChild(fb);

  if (state) {
    const live = el('div', 'b-block keys');
    live.appendChild(el('h4', null, 'Your current run'));
    const ul = el('ul');
    const m = state.metrics;
    const picks = { rtl: ['cells'], synth: ['cells', 'area'], floorplan: ['util', 'area'], powerplan: ['irPct', 'power'], place: ['cong', 'wire'], cts: ['skew', 'holdWns'], route: ['drc', 'wire'], sta: ['wns', 'tns', 'holdWns'], signoff: ['drc', 'wns', 'holdWns', 'irPct'] };
    for (const id of picks[stage.id] || []) {
      const d = METRIC_DEFS.find((x) => x.id === id);
      if (!d) continue;
      ul.appendChild(el('li', null, `${d.label}: ${d.fmt(m[id])}${d.unit ? ' ' + d.unit : ''} — ${d.hint}`));
    }
    live.appendChild(ul);
    host.appendChild(live);
  }
}

export function renderQuiz(host, stage, progress, onAnswer) {
  host.innerHTML = '';
  const key = stage.id;
  const rec = progress.quiz[key] || { answers: {} };

  const qaHead = el('div', 'b-block');
  qaHead.appendChild(el('h4', null, 'Say it out loud — interview answers'));
  for (const item of stage.interview) {
    const card = el('div', 'qa');
    const q = el('button', 'qa-q');
    q.type = 'button';
    q.append(el('span', 'qi', 'Q'), el('span', null, item.q), el('span', 'caret', '▶'));
    const a = el('div', 'qa-a');
    a.appendChild(el('p', null, item.a));
    for (const f of item.followups || []) {
      const fu = el('div', 'fu');
      fu.appendChild(el('b', null, 'Follow-up: ' + f.q));
      fu.appendChild(el('span', null, f.a));
      a.appendChild(fu);
    }
    q.addEventListener('click', () => card.classList.toggle('open'));
    card.append(q, a);
    qaHead.appendChild(card);
  }
  host.appendChild(qaHead);

  const done = Object.keys(rec.answers).length;
  const right = Object.values(rec.answers).filter((v) => v === true).length;
  const score = el('div', 'quiz-score');
  score.append(el('b', null, `${right}/${stage.quiz.length}`), el('span', null, done === stage.quiz.length ? 'Quiz complete for this stage. Re-answer any time.' : 'Pick an answer. The reason is shown either way.'));
  host.appendChild(score);

  stage.quiz.forEach((q, qi) => {
    const card = el('div', 'quiz-card');
    card.appendChild(el('div', 'qn', `Question ${qi + 1} of ${stage.quiz.length}`));
    card.appendChild(el('div', 'qt', q.q));
    const opts = [];
    const answered = rec.answers[qi] !== undefined;
    q.options.forEach((text, oi) => {
      const b = el('button', 'qopt', text);
      b.type = 'button';
      if (answered) {
        b.disabled = true;
        if (oi === q.answer) b.classList.add('right');
        else if (rec.answers[qi] === false && rec.pick?.[qi] === oi) b.classList.add('wrong');
      }
      b.addEventListener('click', () => {
        const correct = oi === q.answer;
        opts.forEach((x, xi) => { x.disabled = true; if (xi === q.answer) x.classList.add('right'); });
        if (!correct) b.classList.add('wrong');
        const why = el('div', 'qwhy');
        why.append(el('b', null, correct ? 'Correct. ' : 'Not quite. '), document.createTextNode(q.why));
        card.appendChild(why);
        onAnswer(stage.id, qi, correct, oi);
      });
      opts.push(b);
      card.appendChild(b);
    });
    if (answered) {
      const why = el('div', 'qwhy');
      why.append(el('b', null, rec.answers[qi] ? 'Correct. ' : 'Answer: '), document.createTextNode(q.why));
      card.appendChild(why);
    }
    host.appendChild(card);
  });
}

export function renderReports(host, state, verdicts, onExport) {
  host.innerHTML = '';
  const grid = el('div', 'rep-grid');
  const mk = (title, rows) => {
    const r = el('div', 'rep');
    r.appendChild(el('h4', null, title));
    const t = el('table');
    for (const [k, v, cls] of rows) {
      const tr = el('tr');
      tr.append(el('td', null, k), el('td', cls || '', v));
      t.appendChild(tr);
    }
    r.appendChild(t);
    return r;
  };
  const m = state.metrics, fp = state.fp, s = state;
  grid.appendChild(mk('Floorplan', [
    ['design', s.design.name],
    ['die', `${fp.dieW.toFixed(1)} × ${fp.dieH.toFixed(1)} µm`],
    ['core', `${fp.coreW.toFixed(1)} × ${fp.coreH.toFixed(1)} µm`],
    ['rows × sites', `${fp.rows} × ${fp.sites}`],
    ['utilisation', m.util.toFixed(1) + '%', m.util < 78 ? 'ok' : m.util < 88 ? 'warn' : 'bad'],
    ['macros', String(s.design.macros)],
  ]));
  grid.appendChild(mk('Timing', [
    ['clock period', s.p.clock.toFixed(2) + ' ns'],
    ['setup WNS', m.wns.toFixed(3) + ' ns', m.wns >= 0 ? 'ok' : 'bad'],
    ['setup TNS', m.tns.toFixed(1) + ' ns', m.tns >= 0 ? 'ok' : 'bad'],
    ['failing endpoints', String(s.tm ? s.tm.endpoints : 0)],
    ['hold WNS', m.holdWns.toFixed(3) + ' ns', m.holdWns >= 0 ? 'ok' : 'bad'],
    ['slew / cap violators', String(s.tm ? s.tm.slewViol : 0)],
  ]));
  grid.appendChild(mk('Clock & power', [
    ['skew', m.skew.toFixed(3) + ' ns', s.ck && s.ck.skewOk ? 'ok' : 'warn'],
    ['insertion delay', s.ck ? s.ck.latency.toFixed(3) + ' ns' : '—'],
    ['clock cells', s.ck ? String(s.ck.clkCells) : '—'],
    ['dynamic', s.pw.dyn.toFixed(1) + ' mW'],
    ['leakage', s.pw.leak.toFixed(2) + ' mW'],
    ['IR drop', m.irPct.toFixed(1) + '%', m.irPct < 5 ? 'ok' : m.irPct < 10 ? 'warn' : 'bad'],
  ]));
  grid.appendChild(mk('Routing & signoff', [
    ['wirelength', (m.wire / 1000).toFixed(2) + ' mm'],
    ['vias', s.rt ? s.rt.vias.toLocaleString() : '—'],
    ['congestion', m.cong.toFixed(2) + '×', m.cong < 0.85 ? 'ok' : m.cong < 1.05 ? 'warn' : 'bad'],
    ['DRC', String(m.drc), m.drc === 0 ? 'ok' : 'bad'],
    ['unrouted', s.rt ? String(s.rt.unrouted) : '—', s.rt && s.rt.unrouted === 0 ? 'ok' : 'bad'],
    ['antenna', s.rt ? String(s.rt.antenna) : '—'],
  ]));
  host.appendChild(grid);

  const st = el('div', 'rep');
  st.style.marginTop = '11px';
  st.appendChild(el('h4', null, 'Stage verdicts'));
  const t = el('table');
  for (const s2 of STAGES) {
    const v = verdicts[s2.id];
    const tr = el('tr');
    tr.append(el('td', null, s2.name), el('td', v ? (v.ok ? 'ok' : 'bad') : '', v ? (v.ok ? 'PASS' : 'FAIL') : 'not run'));
    t.appendChild(tr);
  }
  st.appendChild(t);
  host.appendChild(st);

  const act = el('div', 'rep-actions');
  const b1 = el('button', 'btn tiny', 'Download JSON report');
  b1.type = 'button'; b1.addEventListener('click', () => onExport('json'));
  const b2 = el('button', 'btn tiny', 'Download run log (.txt)');
  b2.type = 'button'; b2.addEventListener('click', () => onExport('log'));
  const b3 = el('button', 'btn tiny', 'Download layout PNG');
  b3.type = 'button'; b3.addEventListener('click', () => onExport('png'));
  act.append(b1, b2, b3);
  host.appendChild(act);
}