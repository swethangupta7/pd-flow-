import { PALETTE, METALS, PDK } from './pdk.js';
import { clamp } from './engine-model.js';
import { DieView } from './render-core.js';

const heat = (v) => {
  // cool cyan → acid → amber → red, readable at every step
  const stops = [
    [0.0, 34, 211, 238], [0.35, 163, 230, 53],
    [0.62, 245, 165, 36], [0.85, 255, 77, 77], [1.0, 255, 59, 48],
  ];
  const t = clamp(v, 0, 1);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const a = stops[i - 1], b = stops[i];
      const k = (t - a[0]) / (b[0] - a[0] || 1);
      return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
    }
  }
  return [255, 59, 48];
};

DieView.prototype.draw = function () {
  const ctx = this.ctx, s = this.state;
  const W = this.w, H = this.h;
  ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

  if (!s) {
    ctx.fillStyle = '#080d1c';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.ink3;
    ctx.font = '500 13px ui-monospace, monospace';
    ctx.fillText('loading floorplan…', 20, 28);
    return;
  }

  // Static layout is expensive (thousands of cells and wires). Render it once
  // into an offscreen bitmap and blit it; only animated marks redraw per frame.
  const key = this._staticKey + '|' + W + 'x' + H + '|' +
    this.cam.x.toFixed(1) + ',' + this.cam.y.toFixed(1) + ',' + this.cam.z.toFixed(3);
  if (key !== this._cacheKey || !this._static) {
    if (!this._static) {
      this._static = document.createElement('canvas');
      this._sctx = this._static.getContext('2d');
    }
    const pw = Math.floor(W * this.dpr), ph = Math.floor(H * this.dpr);
    if (this._static.width !== pw || this._static.height !== ph) {
      this._static.width = pw; this._static.height = ph;
    }
    this._renderStatic(this._sctx, s);
    this._cacheKey = key;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = this.reveal < 1 ? 0.35 + 0.65 * this.reveal : 1;
  ctx.drawImage(this._static, 0, 0);
  ctx.globalAlpha = 1;
  ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

  const fp = s.fp, z = this.cam.z;
  const X = (x) => this.cam.x + (fp.margin + x) * z;
  const Y = (y) => this.cam.y + (fp.margin + y) * z;
  this._drawDynamic(ctx, s, X, Y, z);
};

DieView.prototype._renderStatic = function (ctx, s) {
  const W = this.w, H = this.h;
  ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

  // backdrop
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#080d1c');
  bg.addColorStop(0.55, '#0a1122');
  bg.addColorStop(1, '#0d1526');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (!s) return;

  const p = s.p, fp = s.fp, g = s.geom;
  const z = this.cam.z;
  const ox = this.cam.x + fp.margin * z;
  const oy = this.cam.y + fp.margin * z;
  const X = (x) => ox + x * z;
  const Y = (y) => oy + y * z;
  const rev = 1;
  const glow = p.glow;

  // ambient wafer sheen behind the die
  if (glow) {
    const cx = X(fp.coreW / 2), cy = Y(fp.coreH / 2);
    const rad = Math.max(fp.dieW, fp.dieH) * z * 0.85;
    const gl = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    gl.addColorStop(0, 'rgba(34,211,238,0.10)');
    gl.addColorStop(0.5, 'rgba(120,90,220,0.05)');
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- neighbouring blocks: gives the die a floorplan context ----
  {
    const dw = fp.dieW * z, dh = fp.dieH * z;
    const dx = this.cam.x, dy = this.cam.y;
    const gap = 14 * z;
    ctx.save();
    ctx.strokeStyle = 'rgba(125,211,252,0.13)';
    ctx.fillStyle = 'rgba(17,26,48,0.42)';
    ctx.lineWidth = 1;
    ctx.font = '500 10px ui-monospace, monospace';
    const neighbours = [
      { x: dx - dw * 0.62 - gap, y: dy, w: dw * 0.62, h: dh * 0.46, n: 'pll / analog' },
      { x: dx - dw * 0.62 - gap, y: dy + dh * 0.46 + gap, w: dw * 0.62, h: dh * 0.54 - gap, n: 'io_ring' },
      { x: dx + dw + gap, y: dy, w: dw * 0.5, h: dh * 0.6, n: 'sram_bank' },
      { x: dx + dw + gap, y: dy + dh * 0.6 + gap, w: dw * 0.5, h: dh * 0.4 - gap, n: 'periph' },
      { x: dx, y: dy - dh * 0.3 - gap, w: dw, h: dh * 0.3, n: 'top_level routing channel' },
      { x: dx, y: dy + dh + gap, w: dw, h: dh * 0.26, n: 'debug / spare' },
    ];
    for (const b of neighbours) {
      if (b.x > W || b.y > H || b.x + b.w < 0 || b.y + b.h < 0) continue;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
      if (b.w > 90 && b.h > 26) {
        ctx.fillStyle = 'rgba(159,176,208,0.30)';
        ctx.fillText(b.n, b.x + 9, b.y + 17);
        ctx.fillStyle = 'rgba(17,26,48,0.42)';
      }
    }
    ctx.restore();
  }

  // ---- die + core ----
  if (this.layers.has('core')) {
    const dx = this.cam.x, dy = this.cam.y, dw = fp.dieW * z, dh = fp.dieH * z;
    ctx.fillStyle = '#0e1730';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.strokeStyle = 'rgba(125,211,252,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);

    // seal ring hatch
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.rect(X(0), Y(0), fp.coreW * z, fp.coreH * z);
    ctx.clip('evenodd');
    ctx.strokeStyle = 'rgba(125,211,252,0.16)';
    ctx.lineWidth = 1;
    const step = 9;
    for (let i = -dh; i < dw + dh; i += step) {
      ctx.beginPath(); ctx.moveTo(dx + i, dy); ctx.lineTo(dx + i + dh, dy + dh); ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#0b1020';
    ctx.fillRect(X(0), Y(0), fp.coreW * z, fp.coreH * z);

    // placement rows
    if (p.grid && z > 0.35) {
      const rowPx = PDK.siteH * z;
      const stride = rowPx < 2.2 ? Math.ceil(2.2 / rowPx) : 1;
      ctx.strokeStyle = 'rgba(125,211,252,0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let r = 0; r <= fp.rows; r += stride) {
        const y = Math.round(Y(r * PDK.siteH)) + 0.5;
        ctx.moveTo(X(0), y); ctx.lineTo(X(fp.coreW), y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(163,230,53,0.75)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(X(0), Y(0), fp.coreW * z, fp.coreH * z);
    ctx.setLineDash([]);
  }

  // ---- overlay field ----
  if (p.overlay !== 'none' && g.field) {
    const n = g.field.n, cw = (fp.coreW / n) * z, ch = (fp.coreH / n) * z;
    ctx.save();
    ctx.globalAlpha = 0.5 * rev;
    for (let iy = 0; iy < n; iy++) {
      for (let ix = 0; ix < n; ix++) {
        const v = g.field.data[iy * n + ix];
        if (v < 0.04) continue;
        const [r, gg, b] = heat(v);
        ctx.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${0.16 + v * 0.62})`;
        ctx.fillRect(X(ix * fp.coreW / n), Y(iy * fp.coreH / n), cw + 0.6, ch + 0.6);
      }
    }
    ctx.restore();
  }

  // ---- macros ----
  if (this.layers.has('macros')) {
    for (const m of g.macros) {
      ctx.fillStyle = 'rgba(196,181,253,0.10)';
      ctx.fillRect(X(m.x - m.halo), Y(m.y - m.halo), (m.w + 2 * m.halo) * z, (m.h + 2 * m.halo) * z);
      ctx.strokeStyle = 'rgba(196,181,253,0.42)';
      ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
      ctx.strokeRect(X(m.x - m.halo), Y(m.y - m.halo), (m.w + 2 * m.halo) * z, (m.h + 2 * m.halo) * z);
      ctx.setLineDash([]);
      const mg = ctx.createLinearGradient(X(m.x), Y(m.y), X(m.x + m.w), Y(m.y + m.h));
      mg.addColorStop(0, '#2b2350'); mg.addColorStop(1, '#1d2b4d');
      ctx.fillStyle = mg;
      ctx.fillRect(X(m.x), Y(m.y), m.w * z, m.h * z);
      ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 1.6;
      ctx.strokeRect(X(m.x), Y(m.y), m.w * z, m.h * z);
      if (z > 0.5) {
        ctx.strokeStyle = 'rgba(196,181,253,0.22)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 8; i++) {
          const y = Y(m.y + (m.h / 8) * i);
          ctx.moveTo(X(m.x) + 3, y); ctx.lineTo(X(m.x + m.w) - 3, y);
        }
        ctx.stroke();
        ctx.fillStyle = '#ddd6fe';
        ctx.font = `600 ${clamp(11 * Math.min(1, z), 8, 13)}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(m.name, X(m.x + m.w / 2), Y(m.y + m.h / 2) + 4);
        ctx.textAlign = 'left';
      }
    }
  }

  // ---- power grid ----
  if (this.layers.has('power') && g.straps.length) {
    ctx.save();
    ctx.globalAlpha = 0.85 * rev;
    ctx.strokeStyle = 'rgba(224,122,63,0.55)';
    ctx.lineWidth = Math.max(0.6, p.strapW * z * 0.5);
    ctx.beginPath();
    for (const st of g.straps) { ctx.moveTo(X(st.x1), Y(st.y1)); ctx.lineTo(X(st.x2), Y(st.y2)); }
    ctx.stroke();
    // rails
    ctx.strokeStyle = 'rgba(224,122,63,0.22)';
    ctx.lineWidth = Math.max(0.4, 0.48 * z);
    ctx.beginPath();
    for (const y of g.rails) { ctx.moveTo(X(0), Y(y)); ctx.lineTo(X(fp.coreW), Y(y)); }
    ctx.stroke();
    // ring
    ctx.strokeStyle = '#e07a3f';
    ctx.lineWidth = Math.max(1.2, 6 * z);
    ctx.strokeRect(X(-4), Y(-4), (fp.coreW + 8) * z, (fp.coreH + 8) * z);
    // via arrays at crossings
    if (z > 1.1) {
      ctx.fillStyle = 'rgba(255,196,140,0.75)';
      const vs = g.straps.filter((a) => a.v), hs = g.straps.filter((a) => !a.v);
      for (const a of vs) for (const b of hs) ctx.fillRect(X(a.x1) - 1.4, Y(b.y1) - 1.4, 2.8, 2.8);
    }
    ctx.restore();
  }

  // ---- standard cells ----
  if (this.layers.has('cells') && g.cells.length) {
    const minW = Math.max(0.7, 0.9);
    ctx.save();
    ctx.globalAlpha = rev;
    let last = '';
    for (const c of g.cells) {
      const col = c.crit ? '#ff6b6b' : c.c;
      if (col !== last) { ctx.fillStyle = col; last = col; }
      const w = Math.max(minW, c.w * z), h = Math.max(minW, c.h * z);
      ctx.fillRect(X(c.x), Y(c.y), w, h);
    }
    if (z > 3.2) {
      ctx.strokeStyle = 'rgba(7,11,22,0.85)'; ctx.lineWidth = 0.6;
      for (const c of g.cells) ctx.strokeRect(X(c.x), Y(c.y), c.w * z, c.h * z);
    }
    ctx.restore();
  }
  this._drawStaticTop(ctx, s, X, Y, z, glow);
};