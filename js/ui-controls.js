import { OVERLAYS } from './pdk.js';

export const CONTROL_DEFS = [
  { g: 'Floorplan' },
  { k: 'util', t: 'range', label: 'Target utilisation', min: 30, max: 88, step: 1, unit: '%', hint: 'Cell area ÷ core area. Higher packs cells tighter and raises congestion.' },
  { k: 'aspect', t: 'range', label: 'Core aspect ratio', min: 0.5, max: 2.2, step: 0.05, fmt: (v) => v.toFixed(2), hint: 'Height ÷ width. 1.00 is square and gives the shortest average wires.' },
  { k: 'margin', t: 'range', label: 'Core-to-die margin', min: 4, max: 30, step: 1, unit: ' µm', hint: 'Ring space for IO and the power ring.' },

  { g: 'Macros & power grid' },
  { k: 'macroMode', t: 'seg', label: 'Macro placement', opts: [['corners', 'Corners'], ['auto', 'Spread'], ['center', 'Centre']], hint: 'Centre blocks the middle and squeezes the channels.' },
  { k: 'halo', t: 'range', label: 'Macro halo', min: 2, max: 16, step: 1, unit: ' µm', hint: 'Keep-out around macros so their pins stay routable.' },
  { k: 'channel', t: 'range', label: 'Macro channel', min: 6, max: 40, step: 1, unit: ' µm', hint: 'Gap between macros. Narrow channels congest fast.' },
  { k: 'strapPitch', t: 'range', label: 'Strap pitch', min: 16, max: 80, step: 2, unit: ' µm', hint: 'Closer straps lower IR drop but steal routing tracks.' },
  { k: 'strapW', t: 'range', label: 'Strap width', min: 1, max: 8, step: 0.5, unit: ' µm', fmt: (v) => v.toFixed(1), hint: 'Wider metal carries more current — less drop, less EM risk.' },

  { g: 'Placement' },
  { k: 'density', t: 'range', label: 'Placement density', min: 0.35, max: 0.85, step: 0.01, fmt: (v) => v.toFixed(2), hint: 'Local spread limit for the global placer, not the average utilisation.' },
  { k: 'effort', t: 'seg', label: 'Routability effort', opts: [['low', 'Low'], ['med', 'Med'], ['high', 'High']], hint: 'High effort spreads cells and pads pins; slower but cleaner routing.' },

  { g: 'Clock' },
  { k: 'clock', t: 'range', label: 'Clock period', min: 2, max: 20, step: 0.25, unit: ' ns', fmt: (v) => v.toFixed(2), hint: 'Shorter period = higher frequency = harder setup.' },
  { k: 'ctsLevels', t: 'step', label: 'CTS buffer levels', min: 1, max: 5, hint: 'More levels balance skew better but add latency and clock power.' },
  { k: 'skewTarget', t: 'range', label: 'Skew target', min: 0.05, max: 0.4, step: 0.01, unit: ' ns', fmt: (v) => v.toFixed(2), hint: 'Max allowed arrival difference between clock leaves.' },

  { g: 'Routing & timing' },
  { k: 'layers', t: 'step', label: 'Routing layers', min: 2, max: 5, hint: 'met1 up to this layer. More layers = more track supply.' },
  { k: 'vtMix', t: 'range', label: 'LVT fraction', min: 0, max: 1, step: 0.05, fmt: (v) => Math.round(v * 100) + '%', hint: 'Low-Vt cells are fast but leak. Use them only on critical paths.' },

  { g: 'View' },
  { k: 'overlay', t: 'select', label: 'Analysis overlay', opts: OVERLAYS.map((o) => [o.id, o.label]), hint: 'Heat map drawn over the layout.' },
  { k: 'quality', t: 'seg', label: 'Render quality', opts: [['low', 'Low'], ['med', 'Med'], ['high', 'High']], hint: 'How many cells and wires are drawn. Geometry stays the same.' },
  { k: 'grid', t: 'switch', label: 'Placement rows' },
  { k: 'glow', t: 'switch', label: 'Glow & critical highlight' },
  { k: 'animate', t: 'switch', label: 'Clock pulse & blink' },
];

const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };

export function buildDeck(host, params, onChange) {
  host.innerHTML = '';
  const refs = {};
  for (const d of CONTROL_DEFS) {
    if (d.g) { host.appendChild(el('div', 'ctl-group', d.g)); continue; }
    const wrap = el('div', 'ctl');
    const head = el('div', 'ctl-h');
    const id = 'ctl-' + d.k;
    const lab = el('label', null, d.label);
    lab.htmlFor = id;
    head.appendChild(lab);

    if (d.t === 'range') {
      const out = el('output');
      head.appendChild(out);
      wrap.appendChild(head);
      const inp = document.createElement('input');
      inp.type = 'range'; inp.id = id; inp.min = d.min; inp.max = d.max; inp.step = d.step;
      inp.value = params[d.k];
      const paint = () => {
        const v = Number(inp.value);
        out.textContent = (d.fmt ? d.fmt(v) : v) + (d.unit || '');
        inp.style.setProperty('--p', ((v - d.min) / (d.max - d.min) * 100) + '%');
      };
      inp.addEventListener('input', () => { paint(); onChange(d.k, Number(inp.value), false); });
      inp.addEventListener('change', () => onChange(d.k, Number(inp.value), true));
      paint();
      wrap.appendChild(inp);
      refs[d.k] = { set: (v) => { inp.value = v; paint(); } };
    } else if (d.t === 'step') {
      const val = el('span', 'val');
      head.appendChild(el('span'));
      wrap.appendChild(head);
      const st = el('div', 'stepper');
      const minus = el('button', null, '−'); minus.type = 'button'; minus.setAttribute('aria-label', 'decrease ' + d.label);
      const plus = el('button', null, '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'increase ' + d.label);
      val.textContent = params[d.k];
      const bump = (dir) => {
        const v = Math.min(d.max, Math.max(d.min, Number(params[d.k]) + dir));
        if (v === params[d.k]) return;
        val.textContent = v; onChange(d.k, v, true);
      };
      minus.addEventListener('click', () => bump(-1));
      plus.addEventListener('click', () => bump(1));
      st.append(minus, val, plus);
      wrap.appendChild(st);
      refs[d.k] = { set: (v) => { val.textContent = v; } };
    } else if (d.t === 'seg') {
      wrap.appendChild(head);
      const seg = el('div', 'seg');
      const btns = [];
      for (const [v, lbl] of d.opts) {
        const b = el('button', params[d.k] === v ? 'on' : '', lbl);
        b.type = 'button';
        b.addEventListener('click', () => { btns.forEach((x) => x.classList.remove('on')); b.classList.add('on'); onChange(d.k, v, true); });
        btns.push(b); seg.appendChild(b);
      }
      wrap.appendChild(seg);
      refs[d.k] = { set: (v) => btns.forEach((b, i) => b.classList.toggle('on', d.opts[i][0] === v)) };
    } else if (d.t === 'select') {
      wrap.appendChild(head);
      const sel = document.createElement('select');
      sel.id = id;
      for (const [v, lbl] of d.opts) { const o = document.createElement('option'); o.value = v; o.textContent = lbl; sel.appendChild(o); }
      sel.value = params[d.k];
      sel.addEventListener('change', () => onChange(d.k, sel.value, true));
      wrap.appendChild(sel);
      refs[d.k] = { set: (v) => { sel.value = v; } };
    } else if (d.t === 'switch') {
      wrap.classList.add('switch');
      head.replaceChildren(lab);
      const sw = el('div', 'sw' + (params[d.k] ? ' on' : ''));
      sw.id = id; sw.tabIndex = 0; sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-checked', String(!!params[d.k]));
      sw.setAttribute('aria-label', d.label);
      const toggle = () => { const v = !sw.classList.contains('on'); sw.classList.toggle('on', v); sw.setAttribute('aria-checked', String(v)); onChange(d.k, v, true); };
      sw.addEventListener('click', toggle);
      sw.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      wrap.append(lab, sw);
      refs[d.k] = { set: (v) => { sw.classList.toggle('on', !!v); sw.setAttribute('aria-checked', String(!!v)); } };
    }
    if (d.hint) wrap.appendChild(el('div', 'ctl-hint', d.hint));
    host.appendChild(wrap);
  }
  return refs;
}