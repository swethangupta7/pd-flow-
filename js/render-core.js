import { PDK, PALETTE } from './pdk.js';
import { clamp, lerp } from './engine-model.js';

export class DieView {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.state = null;
    this.layers = new Set(['core', 'macros', 'cells', 'power', 'clock', 'routes', 'pins', 'viol']);
    this.cam = { x: 0, y: 0, z: 1 };
    this.target = { x: 0, y: 0, z: 1 };
    this.dpr = 1;
    this.w = 0; this.h = 0;
    this.hover = null;
    this.pointer = { x: -1, y: -1, down: false, lx: 0, ly: 0, moved: false };
    this.pulse = 0;
    this.reveal = 1;
    this.opts = opts;
    this.raf = 0;
    this.running = false;
    this._bind();
    this.resize();
  }

  _bind() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      this.pointer.down = true; this.pointer.moved = false;
      this.pointer.lx = e.clientX; this.pointer.ly = e.clientY;
      cv.classList.add('grabbing');
    });
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      this.pointer.x = e.clientX - r.left; this.pointer.y = e.clientY - r.top;
      if (this.pointer.down) {
        const dx = e.clientX - this.pointer.lx, dy = e.clientY - this.pointer.ly;
        if (Math.abs(dx) + Math.abs(dy) > 2) this.pointer.moved = true;
        this.target.x += dx; this.target.y += dy;
        this.cam.x += dx; this.cam.y += dy;
        this.pointer.lx = e.clientX; this.pointer.ly = e.clientY;
      }
      this._hit();
    });
    const up = (e) => {
      this.pointer.down = false;
      cv.classList.remove('grabbing');
      if (e && cv.hasPointerCapture?.(e.pointerId)) cv.releasePointerCapture(e.pointerId);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => { this.pointer.x = -1; this.hover = null; this.opts.onHover?.(null); });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const f = Math.exp(-e.deltaY * 0.0016);
      const nz = clamp(this.target.z * f, 0.25, 14);
      const k = nz / this.target.z;
      this.target.x = mx - (mx - this.target.x) * k;
      this.target.y = my - (my - this.target.y) * k;
      this.target.z = nz;
    }, { passive: false });
    cv.addEventListener('dblclick', () => this.fit());
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(cv.parentElement || cv);
  }

  resize() {
    const host = this.cv.parentElement || this.cv;
    const r = host.getBoundingClientRect();
    const w = Math.max(240, Math.floor(r.width));
    const h = Math.max(200, Math.floor(r.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w; this.h = h;
    this.cv.width = Math.floor(w * this.dpr);
    this.cv.height = Math.floor(h * this.dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this._cacheKey = null;
    if (this.state) this.fit(true);
    this.draw();
  }

  fit(instant = false) {
    if (!this.state) return;
    const { dieW, dieH } = this.state.fp;
    const pad = 46;
    const z = Math.min((this.w - pad * 2) / dieW, (this.h - pad * 2) / dieH);
    this.target.z = z;
    this.target.x = (this.w - dieW * z) / 2;
    this.target.y = (this.h - dieH * z) / 2;
    if (instant) { this.cam.x = this.target.x; this.cam.y = this.target.y; this.cam.z = this.target.z; }
  }

  setState(s, reveal = false) {
    const first = !this.state;
    const shapeChanged = !first && (
      Math.abs(this.state.fp.dieW - s.fp.dieW) > 0.5 ||
      Math.abs(this.state.fp.dieH - s.fp.dieH) > 0.5);
    this.state = s;
    this._staticKey = [
      s.stageIdx, s.design.id, s.p.quality, s.p.overlay, s.p.grid, s.p.glow,
      s.fp.dieW.toFixed(2), s.fp.dieH.toFixed(2), s.p.layers, s.p.strapPitch,
      s.p.strapW, s.p.util, s.p.aspect, s.p.margin, s.p.macroMode, s.p.halo,
      s.p.channel, s.p.density, s.p.effort, s.p.ctsLevels, s.p.vtMix, s.p.clock,
      [...this.layers].sort().join(','),
    ].join('|');
    this._cacheKey = null;
    if (first || shapeChanged) this.fit(first);
    if (reveal) this.reveal = 0;
    this.start();
  }

  setLayer(id, on) {
    if (on) this.layers.add(id); else this.layers.delete(id);
    this._cacheKey = null;
    this.draw();
  }

  toWorld(px, py) {
    const { margin } = this.state.fp;
    return {
      x: (px - this.cam.x) / this.cam.z - margin,
      y: (py - this.cam.y) / this.cam.z - margin,
    };
  }

  _hit() {
    if (!this.state || this.pointer.x < 0) return;
    const { x, y } = this.toWorld(this.pointer.x, this.pointer.y);
    const g = this.state.geom;
    let hit = null;
    for (const m of g.macros) {
      if (x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) {
        hit = { kind: 'macro', title: m.name, rows: [['type', 'SRAM hard macro'], ['size', `${m.w} × ${m.h} µm`], ['halo', `${m.halo} µm`], ['orient', 'R0']] };
        break;
      }
    }
    if (!hit && this.layers.has('cells')) {
      const tol = Math.max(1.2, 3 / this.cam.z);
      for (let i = g.cells.length - 1; i >= 0; i--) {
        const c = g.cells[i];
        if (x >= c.x - tol && x <= c.x + c.w + tol && y >= c.y - tol && y <= c.y + c.h + tol) {
          hit = { kind: 'cell', title: `${c.k}_${i}`, rows: [['class', c.k], ['width', `${c.w.toFixed(2)} µm (${Math.round(c.w / PDK.siteW)} sites)`], ['row y', `${c.y.toFixed(2)} µm`], ['critical', c.crit ? 'yes' : 'no']] };
          break;
        }
      }
    }
    const key = hit ? hit.title : null;
    if (key !== (this.hover?.title ?? null)) { this.hover = hit; this.opts.onHover?.(hit); }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.cam.x = lerp(this.cam.x, this.target.x, 0.22);
      this.cam.y = lerp(this.cam.y, this.target.y, 0.22);
      this.cam.z = lerp(this.cam.z, this.target.z, 0.22);
      if (this.reveal < 1) this.reveal = Math.min(1, this.reveal + 0.035);
      this.pulse += 0.016;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() { this.running = false; cancelAnimationFrame(this.raf); }
  destroy() { this.stop(); this._ro?.disconnect(); }
}