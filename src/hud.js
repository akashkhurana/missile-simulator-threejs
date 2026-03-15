/**
 * hud.js — Drives CSS HUD: stats, lock-on, radar, messages
 */

import { pad } from './utils.js';

export class HUD {
  constructor() {
    this.els = {
      aircraftAlt: document.getElementById('aircraft-alt'),
      aircraftSpd: document.getElementById('aircraft-spd'),
      aircraftHdg: document.getElementById('aircraft-hdg'),
      missileSpd: document.getElementById('missile-spd'),
      missileDst: document.getElementById('missile-dst'),
      missileTti: document.getElementById('missile-tti'),
      statLaunched: document.getElementById('stat-launched'),
      statHits: document.getElementById('stat-hits'),
      statMiss: document.getElementById('stat-miss'),
      status: document.getElementById('hud-status'),
      reticle: document.getElementById('reticle'),
    };

    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;
    this.radarAngle = 0;
  }

  updateAircraft(alt, spd, hdg) {
    if (this.els.aircraftAlt) this.els.aircraftAlt.textContent = pad(alt, 4);
    if (this.els.aircraftSpd) this.els.aircraftSpd.textContent = pad(spd, 3);
    if (this.els.aircraftHdg) this.els.aircraftHdg.textContent = pad(hdg, 3);
  }

  updateMissile(spd, dst, tti) {
    if (this.els.missileSpd) this.els.missileSpd.textContent = spd !== null ? pad(spd, 3) : '---';
    if (this.els.missileDst) this.els.missileDst.textContent = dst !== null ? pad(dst, 4) : '---';
    if (this.els.missileTti) this.els.missileTti.textContent = tti !== null ? tti.toFixed(1) : '---';
  }

  updateStats(launched, hits, misses) {
    if (this.els.statLaunched) this.els.statLaunched.textContent = launched;
    if (this.els.statHits) this.els.statHits.textContent = hits;
    if (this.els.statMiss) this.els.statMiss.textContent = misses;
  }

  showStatus(text, type = 'normal') {
    const el = this.els.status;
    if (!el) return;
    el.textContent = text;
    el.className = 'hud-status visible ' + type;
    clearTimeout(this._statusTimeout);
    this._statusTimeout = setTimeout(() => {
      el.className = 'hud-status';
    }, 3000);
  }

  setReticle(visible, locked = false) {
    const el = this.els.reticle;
    if (!el) return;
    el.classList.toggle('hidden', !visible);
    el.classList.toggle('locked', locked);
  }

  /**
   * Draw radar mini-map
   * @param {object} aircraft - { x, z } normalized coordinates [-1,1]
   * @param {Array} missiles - [{ x, z }] normalized coordinates
   */
  updateRadar(dt, aircraft, missiles) {
    if (!this.radarCtx) return;
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) - 4;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0, 12, 24, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Range rings
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r / 3) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cross hairs
    ctx.beginPath();
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Sweep line
    this.radarAngle += dt * 2;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(this.radarAngle) * r,
      cy + Math.sin(this.radarAngle) * r
    );
    ctx.stroke();

    // Sweep trail
    const grad = ctx.createConicGradient(this.radarAngle - 0.5, cx, cy);
    grad.addColorStop(0, 'rgba(0, 229, 255, 0)');
    grad.addColorStop(0.08, 'rgba(0, 229, 255, 0.08)');
    grad.addColorStop(0.1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Aircraft blip
    if (aircraft) {
      const ax = cx + aircraft.x * r * 0.8;
      const ay = cy + aircraft.z * r * 0.8;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(ax, ay, 3, 0, Math.PI * 2);
      ctx.fill();
      // Label
      ctx.fillStyle = '#ff4444';
      ctx.font = '8px Share Tech Mono';
      ctx.fillText('TGT', ax + 5, ay - 3);
    }

    // Missile blips
    ctx.fillStyle = '#00e5ff';
    for (const m of missiles) {
      const mx = cx + m.x * r * 0.8;
      const my = cy + m.z * r * 0.8;
      ctx.beginPath();
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer ring
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  clearMissileData() {
    this.updateMissile(null, null, null);
  }
}
