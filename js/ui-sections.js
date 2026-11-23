import { STAGES, COMPETENCIES, GLOSSARY } from './content/index.js';
import { TOOLCHAIN, PDK_NOTE, DESIGNS } from './pdk.js';
import { renderBrief } from './ui-panes.js';

const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

export function renderLearn(navHost, bodyHost, onJump, initial = 'floorplan') {
  navHost.innerHTML = '';
  bodyHost.innerHTML = '';
  const btns = {}, cards = {};
  for (const s of STAGES) {
    const b = el('button', 'lnav', '');
    b.type = 'button';
    const dot = el('i'); dot.style.background = s.color;
    b.append(dot, el('span', null, `${s.n}. ${s.name}`));
    b.addEventListener('click', () => select(s.id, true));
    navHost.appendChild(b);
    btns[s.id] = b;

    const card = el('article', 'panel learn-card');
    card.id = 'learn-' + s.id;
    card.style.display = 'none';
    const h = el('div', 'lc-h');
    const num = el('span', 'lc-num', String(s.n).padStart(2, '0'));
    num.style.color = s.color;
    h.append(num, el('h3', null, s.name), el('span', 'lc-tool', s.tool));
    card.appendChild(h);
    card.appendChild(el('p', 'lc-sum', s.summary));
    const inner = el('div');
    renderBrief(inner, s, null);
    inner.querySelector('h3')?.remove();
    inner.querySelector('.bsub')?.remove();
    card.appendChild(inner);
    const jump = el('div', 'lc-jump');
    const j = el('button', 'btn tiny', 'Open this stage in the lab ▶');
    j.type = 'button';
    j.addEventListener('click', () => onJump(s.id));
    const q = el('button', 'btn tiny ghost', 'Practise the quiz');
    q.type = 'button';
    q.addEventListener('click', () => onJump(s.id, 'quiz'));
    jump.append(j, q);
    card.appendChild(jump);
    bodyHost.appendChild(card);
    cards[s.id] = card;
  }
  function select(id, scroll) {
    for (const s of STAGES) {
      const on = s.id === id;
      btns[s.id].classList.toggle('on', on);
      btns[s.id].style.background = on ? s.color : '';
      btns[s.id].style.borderColor = on ? s.color : '';
      cards[s.id].style.display = on ? '' : 'none';
    }
    if (scroll) bodyHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  select(initial);
  return { select };
}

export function renderTools(host, noteHost) {
  host.innerHTML = '';
  for (const t of TOOLCHAIN) {
    const c = el('article', 'tool');
    c.style.color = t.color;
    c.appendChild(el('h3', null, t.name));
    c.appendChild(el('div', 'role', t.role));
    c.appendChild(el('p', null, t.what));
    const cmd = el('div', 'tcmd', t.cmd);
    c.appendChild(cmd);
    const st = el('div', 'tstages');
    for (const sid of t.stages) {
      const s = STAGES.find((x) => x.id === sid);
      if (s) st.appendChild(el('span', null, s.short));
    }
    c.appendChild(st);
    host.appendChild(c);
  }
  noteHost.innerHTML = '';
  const h = el('h3', null, 'Getting the PDK');
  h.style.fontSize = '14px'; h.style.marginBottom = '8px';
  noteHost.appendChild(h);
  const p = el('p');
  const parts = PDK_NOTE.split('`');
  parts.forEach((txt, i) => {
    if (i % 2) { const code = el('code', null, txt); p.appendChild(code); }
    else p.appendChild(document.createTextNode(txt));
  });
  noteHost.appendChild(p);
  const designs = el('p');
  designs.style.marginBottom = '0';
  designs.appendChild(el('b', null, 'Designs in this lab: '));
  designs.appendChild(document.createTextNode(DESIGNS.map((d) => `${d.name} (${d.cells.toLocaleString()} cells)`).join(' · ') + '. All are real open-source RTL blocks you can synthesise yourself.'));
  noteHost.appendChild(designs);
}

export function renderProgress(compHost, masteryHost, statHost, glossHost, progress) {
  compHost.innerHTML = '';
  for (const c of COMPETENCIES) {
    const done = c.stages.every((s) => (progress.stages[s] || 0) >= 1) &&
      c.stages.every((s) => {
        const q = progress.quiz[s];
        return q && Object.values(q.answers || {}).filter(Boolean).length >= 2;
      });
    const li = el('li', 'comp' + (done ? ' done' : ''));
    li.append(el('span', 'box', done ? '✓' : ''), el('span', null, c.label));
    compHost.appendChild(li);
  }

  masteryHost.innerHTML = '';
  for (const s of STAGES) {
    const runs = progress.stages[s.id] || 0;
    const q = progress.quiz[s.id];
    const correct = q ? Object.values(q.answers || {}).filter(Boolean).length : 0;
    const pct = Math.min(100, Math.min(runs, 3) * 15 + (correct / s.quiz.length) * 55);
    const row = el('div', 'mrow');
    row.appendChild(el('span', 'mn', s.short + ' · ' + s.name.split(' ')[0]));
    const bar = el('div', 'mbar');
    const fill = el('i');
    fill.style.width = pct + '%';
    fill.style.background = `linear-gradient(90deg,${s.color},#a3e635)`;
    bar.appendChild(fill);
    row.append(bar, el('span', 'mp', Math.round(pct) + '%'));
    masteryHost.appendChild(row);
  }

  statHost.innerHTML = '';
  const stats = [
    ['Stage runs', progress.runs || 0],
    ['Tapeouts', progress.tapeouts || 0],
    ['Quiz correct', Object.values(progress.quiz).reduce((a, q) => a + Object.values(q.answers || {}).filter(Boolean).length, 0)],
  ];
  for (const [label, v] of stats) {
    const s = el('div', 'stat');
    s.append(el('b', null, String(v)), el('span', null, label));
    statHost.appendChild(s);
  }

  glossHost.innerHTML = '';
  for (const [term, def] of GLOSSARY) {
    const row = el('div');
    row.append(el('dt', null, term), el('dd', null, def));
    glossHost.appendChild(row);
  }
}