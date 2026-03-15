/**
 * controls.js — Simplified controls (no manual launch)
 */

export class Controls {
  constructor(simulation) {
    this.sim = simulation;

    this.btnRestart = document.getElementById('btn-restart');
    this.sliderMSpeed = document.getElementById('slider-mspeed');
    this.valMSpeed = document.getElementById('val-mspeed');

    this._bind();
  }

  _bind() {
    // Restart
    this.btnRestart?.addEventListener('click', () => {
      this.sim.restart();
    });

    // Missile speed slider
    this.sliderMSpeed?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.sim.setSpeedMultiplier(val);
      if (this.valMSpeed) this.valMSpeed.textContent = val.toFixed(1) + 'x';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyR':
          this.sim.restart();
          break;
      }
    });
  }

  update() {
    // No launch button state to manage
  }
}
