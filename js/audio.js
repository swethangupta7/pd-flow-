// Small WebAudio kit. Every sound is tied to something visible on screen:
// a control move, a stage starting, a stage passing/failing, tapeout.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    this.lastTick = 0;
  }

  _ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.16 : 0;
    if (on) this._ensure();
  }

  _tone(freq, dur, type = 'sine', gain = 1, slide = 0) {
    const ctx = this._ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  tick() {
    const now = performance.now();
    if (now - this.lastTick < 45) return;
    this.lastTick = now;
    this._tone(1180, 0.035, 'square', 0.16);
  }

  click() { this._tone(660, 0.06, 'triangle', 0.5); }

  stageStart() {
    this._tone(320, 0.12, 'sawtooth', 0.35, 180);
  }

  pass() {
    this._tone(523.25, 0.1, 'triangle', 0.55);
    setTimeout(() => this._tone(783.99, 0.16, 'triangle', 0.5), 90);
  }

  fail() {
    this._tone(196, 0.18, 'sawtooth', 0.45, -60);
    setTimeout(() => this._tone(146.83, 0.22, 'sawtooth', 0.4), 110);
  }

  tapeout() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => setTimeout(() => this._tone(n, 0.28, 'triangle', 0.5), i * 110));
  }

  quiz(correct) {
    if (correct) { this._tone(880, 0.09, 'sine', 0.5); setTimeout(() => this._tone(1318.5, 0.14, 'sine', 0.45), 80); }
    else this._tone(220, 0.16, 'square', 0.3, -40);
  }
}