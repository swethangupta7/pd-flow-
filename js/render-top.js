import { clamp } from './engine-model.js';
import { DieView } from './render-core.js';

// Everything here goes into the cached static bitmap.
DieView.prototype._drawStaticTop = function (ctx, s, X, Y, z, glow) {
  const p = s.p, g = s.geom;

  if (this.layers.has('routes') && g.routes.length) {
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.lineCap = 'round';
    const byLayer = new Map();
    for (const r of g.routes) {
      const k = r.color + '|' + r.dash.join(',');
      if (!byLayer.has(k)) byLayer.set(k, { color: r.color, dash: r.dash, segs: [] });
      byLayer.get(k).segs.push(r);
    }
    for (const grp of byLayer.values()) {
      ctx.strokeStyle = grp.color;
      ctx.setLineDash(grp.dash.map((d) => d * clamp(z * 0.5, 0.5, 2)));
      ctx.lineWidth = Math.max(0.45, 0.3 * z);
      ctx.beginPath();
      for (const r of grp.segs) {
        ctx.moveTo(X(r.x1), Y(r.y1));
        ctx.lineTo(X(r.mx), Y(r.my));
        ctx.lineTo(X(r.x2), Y(r.y2));
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (glow && z > 0.8) {
      ctx.strokeStyle = 'rgba(255,107,107,0.9)';
      ctx.lineWidth = Math.max(1, 0.7 * z);
      ctx.shadowColor = 'rgba(255,80,80,0.8)'; ctx.shadowBlur = 6;
      ctx.beginPath();
      for (const r of g.routes) {
        if (!r.crit) continue;
        ctx.moveTo(X(r.x1), Y(r.y1)); ctx.lineTo(X(r.mx), Y(r.my)); ctx.lineTo(X(r.x2), Y(r.y2));
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  if (this.layers.has('clock') && g.clock) {
    ctx.save();
    ctx.strokeStyle = 'rgba(240,225,74,0.72)';
    ctx.lineWidth = Math.max(0.7, 1.1 * z * 0.6);
    if (glow) { ctx.shadowColor = 'rgba(240,225,74,0.55)'; ctx.shadowBlur = 5; }
    ctx.beginPath();
    for (const [a, b] of g.clock.edges) { ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f0e14a';
    for (const n of g.clock.nodes) {
      const r = Math.max(1.4, (4 - n.lvl * 0.5) * clamp(z, 0.5, 2));
      ctx.beginPath(); ctx.arc(X(n.x), Y(n.y), r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(240,225,74,0.55)';
    for (const n of g.clock.leaves) ctx.fillRect(X(n.x) - 1, Y(n.y) - 1, 2, 2);
    ctx.restore();
  }

  if (this.layers.has('pins')) {
    ctx.save();
    ctx.fillStyle = '#ff4d9d';
    const pw = Math.max(1.6, 2.4 * clamp(z, 0.5, 2.2));
    for (const pin of g.pins) {
      const horiz = pin.side === 0 || pin.side === 2;
      ctx.fillRect(X(pin.x) - (horiz ? pw / 2 : pw), Y(pin.y) - (horiz ? pw : pw / 2), horiz ? pw : pw * 2, horiz ? pw * 2 : pw);
    }
    ctx.restore();
  }
};

// Cheap per-frame marks: blinking violations, clock pulse, hover, HUD.
DieView.prototype._drawDynamic = function (ctx, s, X, Y, z) {
  const p = s.p, g = s.geom;

  if (this.layers.has('clock') && g.clock && p.animate) {
    const t = (this.pulse * 0.45) % 1;
    ctx.save();
    ctx.fillStyle = '#fffbe6';
    ctx.shadowColor = 'rgba(255,251,230,0.9)'; ctx.shadowBlur = 6;
    for (const [a, b] of g.clock.edges) {
      if (a.lvl > 1) continue;
      const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
      ctx.beginPath(); ctx.arc(X(px), Y(py), Math.max(1.6, 2.2 * clamp(z, 0.6, 2)), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  if (this.layers.has('viol') && g.viols.length) {
    ctx.save();
    const blink = p.animate ? 0.55 + 0.45 * Math.sin(this.pulse * 3.2) : 0.9;
    const r = Math.max(2.2, 3.4 * clamp(z, 0.5, 1.8));
    const groups = { drc: [], setup: [], ant: [] };
    for (const v of g.viols) groups[v.t]?.push(v);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = `rgba(255,59,48,${blink})`;
    ctx.beginPath();
    for (const v of groups.drc) {
      const x = X(v.x), y = Y(v.y);
      ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
      ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
    }
    ctx.stroke();
    ctx.strokeStyle = `rgba(251,113,133,${blink})`;
    ctx.beginPath();
    for (const v of groups.setup) { const x = X(v.x), y = Y(v.y); ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
    ctx.stroke();
    ctx.strokeStyle = `rgba(245,165,36,${blink})`;
    ctx.beginPath();
    for (const v of groups.ant) {
      const x = X(v.x), y = Y(v.y);
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
  }

  if (this.hover?.kind === 'macro') {
    const m = g.macros.find((x) => x.name === this.hover.title);
    if (m) {
      ctx.save();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
      ctx.strokeRect(X(m.x) - 2, Y(m.y) - 2, m.w * z + 4, m.h * z + 4);
      ctx.restore();
    }
  }

  ctx.save();
  ctx.font = '500 11px "IBM Plex Mono", ui-monospace, Menlo, monospace';
  const umPerPx = 1 / z;
  let bar = 10;
  for (const c of [1, 2, 5, 10, 20, 50, 100, 200, 500]) if (c / umPerPx <= 130) bar = c;
  const barPx = bar / umPerPx;
  const bx = 16, by = this.h - 20;
  ctx.strokeStyle = 'rgba(232,238,252,0.8)'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(bx, by); ctx.lineTo(bx + barPx, by);
  ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by + 4);
  ctx.moveTo(bx + barPx, by - 4); ctx.lineTo(bx + barPx, by + 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(232,238,252,0.9)';
  ctx.fillText(`${bar} µm`, bx + barPx + 8, by + 4);
  ctx.fillStyle = 'rgba(159,176,208,0.85)';
  ctx.fillText(`zoom ${z.toFixed(2)}×`, bx, by - 12);
  if (this.pointer.x > 0) {
    const w = this.toWorld(this.pointer.x, this.pointer.y);
    ctx.textAlign = 'right';
    ctx.fillText(`x ${w.x.toFixed(1)}  y ${w.y.toFixed(1)} µm`, this.w - 14, this.h - 16);
    ctx.textAlign = 'left';
  }
  ctx.restore();
};