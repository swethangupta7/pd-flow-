import { chapters } from './input-lessons.js';
import { practice } from './input-practice.js';
import { terms } from './input-terms.js';

const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
const lessons = chapters.flatMap(chapter => chapter.lessons.map(lesson => Object.assign(lesson, {
  chapter,
  id: slug(chapter.title) + '-' + slug(lesson.title)
})));

const numeric = (label, unit, min, max, step, initial, apply, updateCode) =>
  ({ label, unit, min, max, step, initial, apply, updateCode });
const ns = n => n.toFixed(1) + ' ns';
const um = n => n.toFixed(2) + ' µm';
const experiments = {
  'liberty-input-capacitance': numeric('Input capacitance', 'fF', 1, 10, 1, 2,
    n => ({ load: 154 + 37 * n }), (code, n) => code.replace('capacitance : 2.0', 'capacitance : ' + n.toFixed(1))),
  'liberty-output-load': numeric('Output load', 'fF', 1, 10, 1, 5, n => ({ load: 144 + 38 * n })),
  'technology-lef-metal-width': numeric('Drawn wire width', 'µm', .06, .20, .01, .10,
    n => ({ top: 118 - n * 225, width: n * 450 })),
  'technology-lef-metal-spacing': numeric('Drawn edge spacing', 'µm', .04, .18, .01, .12,
    n => ({ gap: um(n), gaprow: 86 + 350 * n, gapbox: n >= .10 ? 'g' : 'e', gapstatus: n >= .10 ? 'Meets 0.10 µm minimum' : 'Below 0.10 µm minimum' })),
  'standard-cell-lef-size': numeric('Cell width', 'µm', .2, 1.5, .05, .60,
    n => ({ size: 250 * n, cellWidth: um(n) }), (code, n) => code.replace('SIZE 0.60', 'SIZE ' + n.toFixed(2))),
  'standard-cell-lef-rect': numeric('Right-edge coordinate Xmax', 'µm', .12, .24, .01, .18,
    n => ({ rect: (n - .10) * 2000, xmax: um(n) }), (code, n) => code.replace('0.18 0.35', n.toFixed(2) + ' 0.35')),
  'sdc-clock-period': numeric('Clock period', 'ns', 4, 14, .5, 10,
    n => ({ half: 145 + n * 14, edge: 145 + n * 28, period: ns(n) }), (code, n) => code.replace('-period 10.0', '-period ' + n.toFixed(1))),
  'sdc-setup-violation': numeric('Clock period', 'ns', 8, 12, .1, 10,
    n => {
      const slack = Math.round((n - 9.7) * 10) / 10;
      return { deadline: 444 + slack * 65, slack: 'Slack ' + ns(slack) + (slack >= 0 ? ' · passes' : ' · violation') };
    }, (code, n) => code.replace('-period 10.0', '-period ' + n.toFixed(1))),
  'def-components-placement-and-orientation': numeric('Component X position', 'DBU', 0, 8000, 200, 4000,
    n => ({ placed: 83 + n * .047, pin: 98 + n * .047, defPosition: '(' + n + ', 3000) DBU · orientation N' }),
    (code, n) => code.replace('( 4000 3000 )', '( ' + n + ' 3000 )'))
};

const element = id => document.getElementById(id);
const contents = element('contents');
const article = element('lesson');
const escape = value => String(value).replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const textAt = (x, y, label) => label ? '<text x="' + x + '" y="' + y + '">' + escape(label) + '</text>' : '';
const signalLessons = new Set(['start-here-a-chip-and-a-signal', 'start-here-logic-gates-and-memory', 'netlist-nets', 'netlist-fan-out', 'netlist-pin-mapping', 'sdc-clock-latency', 'sdc-input-delay', 'sdc-output-delay', 'upf-isolation', 'upf-level-shifting']);

function diagram(drawing, title, id, moving = false) {
  const marker = id + '-arrow';
  const shapes = drawing.trim().split(';').map(line => {
    const [type, ...args] = line.trim().split(/\s+/);
    if (type === 'w') return '<polyline class="trace w" points="' + args.map(Number).join(' ') + '"/>';
    if (type === 't') return textAt(+args[0], +args[1], args.slice(2).join(' '));
    const [x, y, endX, endY] = args.slice(0, 4).map(Number);
    const label = args.slice(4).join(' ');
    if (type === 'a' || type === 'l') {
      const arrow = type === 'a' ? ' marker-end="url(#' + marker + ')"' : '';
      const dot = moving && type === 'a'
        ? '<circle class="signal" r="4" data-line="' + [x, y, endX, endY].join(' ') + '" cx="' + x + '" cy="' + y + '"/>'
        : '';
      const labelX = Math.abs(endX - x) < 12 ? x + 10 + label.length * 3.6 : (x + endX) / 2;
      return '<line class="trace ' + type + '" x1="' + x + '" y1="' + y + '" x2="' + endX + '" y2="' + endY + '"' + arrow + '/>' +
        textAt(labelX, (y + endY) / 2 - 13, label) + dot;
    }
    return '<rect class="shape ' + escape(type) + '" x="' + x + '" y="' + y + '" width="' + endX + '" height="' + endY + '" rx="4"/>' +
      textAt(x + endX / 2, y + endY / 2, label);
  }).join('');
  return '<svg viewBox="0 0 640 220" role="img" aria-label="' + escape(title) + '">' +
    '<defs><marker id="' + marker + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 1 L9 5 L0 9 Z" fill="#087165"/></marker></defs>' +
    shapes + '</svg>';
}

function substitute(drawing, values) {
  return drawing.replace(/\$(\w+)/g, (_, name) => values[name]);
}

let lesson;
let step = 0;
let playing = false;
let position = 0;
let previousTime = 0;
let animation;
let speed = 1;
let value;
let experiment;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function showContents() {
  const term = element('lesson-search').value.trim().toLowerCase();
  const open = new Set([...contents.querySelectorAll('details[open]')].map(group => group.dataset.chapter));
  contents.innerHTML = chapters.map(chapter => {
    const matches = chapter.lessons.filter(item => (chapter.title + ' ' + item.title).toLowerCase().includes(term));
    if (!matches.length) return '';
    const expanded = term || chapter === lesson.chapter || open.has(chapter.title) ? ' open' : '';
    return '<details data-chapter="' + escape(chapter.title) + '"' + expanded + '><summary>' + escape(chapter.title) + '</summary><ul>' +
      matches.map(item => '<li><a href="#' + item.id + '"' + (item === lesson ? ' aria-current="location"' : '') + '>' + escape(item.title) + '</a></li>').join('') +
      '</ul></details>';
  }).join('') || '<p>No matching concepts.</p>';
}

const section = (heading, body, className = '') =>
  '<section class="' + className + '"><h3>' + escape(heading) + '</h3>' + body + '</section>';
const paragraph = value => '<p>' + escape(value) + '</p>';
const figure = (frame, id) => '<figure><div class="diagram">' + diagram(frame.drawing, frame.caption, id) +
  '</div><figcaption>' + escape(frame.caption) + '</figcaption></figure>';
const paginationLink = (item, label) => item ? '<a href="#' + item.id + '">' + label + ' · ' + escape(item.title) + '</a>' : '<span></span>';
const controls = [
  ['play', 'Play'], ['pause', 'Pause'], ['restart', 'Restart'], ['previous', 'Previous step'], ['next', 'Next step']
].map(([command, label]) => '<button type="button" data-command="' + command + '">' + label + '</button>').join('');

function experimentControl() {
  if (!experiment) return '';
  const { label, min, max, step: increment } = experiment;
  return '<div class="experiment"><label for="experiment">' + escape(label) +
    ' <output id="experiment-value" for="experiment"></output></label><input id="experiment" type="range" min="' + min +
    '" max="' + max + '" step="' + increment + '" value="' + value + '"><small>Simplified teaching model. The output is illustrative and uses no industrial EDA calculation.</small></div>';
}


function terminology(item) {
  const body = [item.title, item.chapter.title, item.what, item.why, item.meaning, item.engineer, item.tool].join(' ');
  const matches = terms.filter(({ pattern }) => pattern.test(body));
  if (!matches.length) return '';
  return '<details class="word-help"><summary>Words you’ll see in this lesson</summary><dl>' +
    matches.map(({ term, definition }) => '<dt>' + escape(term) + '</dt><dd>' + escape(definition) + '</dd>').join('') +
    '</dl></details>';
}

function practiceCard(item) {
  const question = practice.get(item.title);
  if (!question) return '';
  const answer = (text, correct) => '<button type="button" data-answer="' + correct +
    '" aria-pressed="false">' + escape(text) + '</button>';
  const correct = answer(question.correct, true);
  const other = answer(question.other, false);
  return '<div class="practice"><div class="practice-heading">Predict and check</div><p>' +
    escape(question.question) + '</p><div class="practice-choices" role="group" aria-label="Answer choices">' +
    (question.correctFirst ? correct + other : other + correct) +
    '</div><p id="practice-result" class="practice-result" aria-live="polite"></p></div>';
}

function renderLesson(moveFocus) {
  pause();
  lesson = lessons.find(item => '#' + item.id === location.hash) ?? lessons[0];
  experiment = experiments[lesson.id];
  value = experiment?.initial;
  step = 0;
  position = 0;
  const index = lessons.indexOf(lesson);
  const chapter = lesson.chapter;
  const failure = lesson.frames.at(-1);
  article.innerHTML = '<header><p class="chapter-name">' + escape(chapter.title) + '</p><h2 id="lesson-title" tabindex="-1">' +
    escape(lesson.title) + '</h2></header>' +
    section('What is it?', paragraph(lesson.what) + terminology(lesson)) +
    section('Why do we need it?', paragraph(lesson.why)) +
    section('Simple diagram', figure(lesson.frames[0], 'intro') +
      '<div class="legend"><span style="--swatch:#88b1dc">Component or wire</span><span style="--swatch:#6fb6a8">Active or connected</span><span style="--swatch:#dd8e96">Limit or problem</span></div>') +
    section('How does it work?', '<div class="player"><div class="diagram" id="working-diagram"></div>' +
      '<div class="controls">' + controls +
      '<label class="speed">Speed <select id="lesson-speed"><option value=".5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div>' +
      '<div id="step-caption" class="step-text" aria-live="polite" aria-atomic="true"></div>' + experimentControl() + '</div>' + practiceCard(lesson)) +
    section('File representation', '<div class="syntax"><span class="filename">' + escape(lesson.filename) +
      '</span><pre><code id="file-code"></code></pre></div>' + paragraph(lesson.meaning)) +
    section("Physical Design engineer's perspective", paragraph(lesson.engineer)) +
    section('EDA tool perspective', paragraph(lesson.tool)) +
    section('What happens if it is incorrect?', figure(failure, 'incorrect')) +
    section('Simple summary', paragraph(lesson.summary), 'summary') +
    '<a class="source" href="' + lesson.reference + '">Format and tool reference</a>' +
    '<nav class="lesson-pagination" aria-label="Adjacent lessons">' +
    paginationLink(lessons[index - 1], 'Previous') + paginationLink(lessons[index + 1], 'Next') + '</nav>';
  element('lesson-speed').value = String(speed).replace(/^0\./, '.');
  showContents();
  renderStep();
  if (moveFocus) {
    element('lesson-title').focus({ preventScroll: true });
    article.scrollIntoView({ block: 'start' });
  }
}

function renderCode() {
  const sample = step === 1 && experiment?.updateCode ? experiment.updateCode(lesson.code, value) : lesson.code;
  element('file-code').innerHTML = sample.split('\n').map(line => {
    const isWrapper = /^(?:END\b|endmodule\b|[{}]$|LAYER M[12]$|MACRO\b|COMPONENTS\b|NETS\b|PINS\b|BLOCKAGES\b)/.test(line.trim());
    return '<span class="line' + (isWrapper ? '' : ' highlight') + '">' + escape(line) + '</span>';
  }).join('');
}

function renderButtons() {
  const disable = { play: playing, pause: !playing, previous: step === 0, next: step === lesson.frames.length - 1 };
  for (const button of article.querySelectorAll('[data-command]')) {
    button.disabled = Boolean(disable[button.dataset.command]);
  }
}

function renderStep() {
  const frame = lesson.frames[step];
  const variables = experiment?.apply(value) ?? {};
  element('working-diagram').innerHTML = diagram(substitute(frame.drawing, variables), frame.caption, 'working',
    signalLessons.has(lesson.id) && step > 0 && step < lesson.frames.length - 1 && !reducedMotion.matches);
  element('step-caption').innerHTML = '<strong>Step ' + (step + 1) + ' of ' + lesson.frames.length + '</strong> · ' + escape(frame.caption);
  if (experiment) {
    const digits = experiment.unit === 'µm' ? 2 : experiment.unit === 'ns' ? 1 : 0;
    const formatted = value.toFixed(digits) + ' ' + experiment.unit;
    element('experiment-value').value = formatted;
    element('experiment').setAttribute('aria-valuetext', formatted);
  }
  renderCode();
  renderButtons();
}

function pause() {
  playing = false;
  cancelAnimationFrame(animation);
  if (lesson) renderButtons();
}

function goToStep(index) {
  step = index;
  position = 0;
  renderStep();
}

function tick(time) {
  if (!playing) return;
  position += (time - previousTime) * speed / 3200;
  previousTime = time;
  if (position >= 1) {
    if (step === lesson.frames.length - 1) {
      pause();
      return;
    }
    goToStep(step + 1);
  }
  for (const dot of article.querySelectorAll('.signal')) {
    const [x, y, endX, endY] = dot.dataset.line.split(' ').map(Number);
    const progress = Math.min(position * 1.35, 1);
    dot.setAttribute('cx', x + (endX - x) * progress);
    dot.setAttribute('cy', y + (endY - y) * progress);
  }
  animation = requestAnimationFrame(tick);
}

function play() {
  if (step === lesson.frames.length - 1) goToStep(0);
  playing = true;
  previousTime = performance.now();
  renderButtons();
  animation = requestAnimationFrame(tick);
}

article.addEventListener('click', event => {
  const choice = event.target.closest('button[data-answer]');
  if (choice) {
    for (const button of article.querySelectorAll('button[data-answer]')) {
      button.setAttribute('aria-pressed', String(button === choice));
    }
    const result = element('practice-result');
    const isCorrect = choice.dataset.answer === 'true';
    result.dataset.correct = String(isCorrect);
    result.textContent = (isCorrect ? 'Correct. ' : 'Try again. ') + practice.get(lesson.title).explanation;
    return;
  }
  const command = event.target.closest('button[data-command]')?.dataset.command;
  switch (command) {
    case 'play': play(); break;
    case 'pause': pause(); break;
    case 'restart': {
      const resume = playing;
      pause();
      goToStep(0);
      if (resume) play();
      break;
    }
    case 'previous': pause(); goToStep(step - 1); break;
    case 'next': pause(); goToStep(step + 1); break;
  }
});
article.addEventListener('input', event => {
  if (event.target.id !== 'experiment') return;
  value = event.target.valueAsNumber;
  pause();
  goToStep(1);
});
article.addEventListener('change', event => {
  if (event.target.id === 'lesson-speed') speed = Number(event.target.value);
});
element('lesson-search').addEventListener('input', showContents);
addEventListener('hashchange', () => renderLesson(true));
renderLesson(Boolean(location.hash));
