/**
 * simulation.js — Auto-launch state machine with multiple missile support
 */

import { Missile } from './missile.js';

export const SimState = {
  IDLE: 'IDLE',
  ENGAGED: 'ENGAGED',
};

export class Simulation {
  constructor(scene, aircraft, launcher, cameraSystem, effectsManager, hud) {
    this.scene = scene;
    this.aircraft = aircraft;
    this.launcher = launcher;
    this.cam = cameraSystem;
    this.effects = effectsManager;
    this.hud = hud;

    this.state = SimState.IDLE;
    this.missiles = [];
    this.missileIdCounter = 0;
    this.cooldownTimer = 0;
    this.cooldownDuration = 1.5;

    // Stats
    this.launched = 0;
    this.hits = 0;
    this.misses = 0;

    // Auto-launch
    this.autoTimer = 0;
    this.autoInterval = 4; // seconds between bursts
    this.initialDelay = 2;
    this.totalTime = 0;

    // Speed multiplier
    this.speedMultiplier = 1;
  }

  setSpeedMultiplier(m) {
    this.speedMultiplier = m;
    for (const missile of this.missiles) {
      if (missile.alive) missile.setSpeedMultiplier(m);
    }
  }

  restart() {
    for (const m of this.missiles) {
      m.dispose();
    }
    this.missiles = [];
    this.missileIdCounter = 0;
    this.state = SimState.IDLE;
    this.launched = 0;
    this.hits = 0;
    this.misses = 0;
    this.cooldownTimer = 0;
    this.autoTimer = 0;
    this.totalTime = 0;

    this.aircraft.reset();
    this.cam.resetToDefault();
    this.hud.clearMissileData();
    this.hud.updateStats(0, 0, 0);
    this.hud.setReticle(false);
    this.hud.showStatus('MISSILE SIMULATOR ONLINE', 'normal');
  }

  _launchBurst() {
    const burstCount = 2; // Launch 2 missiles at once
    for (let i = 0; i < burstCount; i++) {
        setTimeout(() => {
            if (this.aircraft.destroyed || this.aircraft.crashing) return;
            this._launchSingle();
        }, i * 400); // 400ms stagger
    }
  }

  _launchSingle() {
    const launchPos = this.launcher.getLaunchPoint();
    const missile = new Missile(this.scene, this.missileIdCounter++, launchPos);
    missile.setSpeedMultiplier(this.speedMultiplier);
    missile.launch();

    this.missiles.push(missile);
    this.launched++;
    this.state = SimState.ENGAGED;

    this.launcher.triggerLaunchFlash();
    this.cam.shake(0.3); // Minor launch shake

    this.hud.showStatus('MISSILES ENGAGED', 'normal');
    this.hud.setReticle(true, true);
    this.hud.updateStats(this.launched, this.hits, this.misses);
  }

  update(dt) {
    this.totalTime += dt;
    const targetPos = this.aircraft.position.clone();
    const targetVel = this.aircraft.getVelocity();

    // Auto-launch logic
    if (!this.aircraft.destroyed && !this.aircraft.crashing && this.totalTime > this.initialDelay) {
      this.autoTimer += dt;
      if (this.autoTimer >= this.autoInterval) {
        this.autoTimer = 0;
        this._launchBurst();
      }
    }

    // Update all missiles
    let activeInView = null;
    let minTti = 999;

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      if (!m.alive) continue;

      m.update(dt, targetPos, targetVel);

      const tti = m.getTimeTo(targetPos);
      if (tti < minTti) {
          minTti = tti;
          activeInView = m;
      }

      if (m.hit) {
        this.hits++;
        this.hud.updateStats(this.launched, this.hits, this.misses);
        this.hud.showStatus('TARGET HIT — CRASHING', 'hit');
        
        this.effects.smallExplosion(m.position.clone());
        this.aircraft.hit(); 
        m.dispose();
      } 
      else if (m.missed) {
        this.misses++;
        this.hud.updateStats(this.launched, this.hits, this.misses);
        this.hud.showStatus('FAIL — RE-ENGAGING', 'miss');
        
        this.effects.smallExplosion(m.position.clone());
        m.dispose();
      }
    }

    // Update aircraft and ground impact
    const impacted = this.aircraft.update(dt);
    if (impacted) {
        this.effects.explode(this.aircraft.position.clone());
        this.hud.showStatus('TARGET NEUTRALIZED', 'hit');
        this.hud.setReticle(false);
        this.cooldownTimer = 0;
    }

    this.missiles = this.missiles.filter(m => m.alive || m.age < m.maxAge + 5);

    // Telemetry and UI flow
    if (activeInView) {
      const dist = activeInView.getDistanceTo(targetPos);
      const tti = activeInView.getTimeTo(targetPos);
      this.hud.updateMissile(
        Math.round(activeInView.getSpeed()),
        Math.round(dist),
        tti
      );
      this.hud.setReticle(true, true);
    } else {
      if (this.aircraft.destroyed) {
          this.cooldownTimer += dt;
          if (this.cooldownTimer > this.cooldownDuration) {
              this.cooldownTimer = 0;
              this.aircraft.reset();
              this.hud.showStatus('NEW TARGET ACQUIRED', 'normal');
              this.hud.clearMissileData();
              this.hud.setReticle(false);
          }
      } else {
          if (this.aircraft.crashing) {
              this.hud.setReticle(true, true);
          } else {
              this.hud.setReticle(false);
          }
      }
    }

    this.cam.update(dt);

    // Radar update
    const radarAircraft = {
      x: this.aircraft.position.x / 500,
      z: this.aircraft.position.z / 500,
    };
    const radarMissiles = this.missiles
      .filter(m => m.alive)
      .map(m => ({
        x: m.position.x / 500,
        z: m.position.z / 500,
      }));
    this.hud.updateRadar(dt, radarAircraft, radarMissiles);
  }
}
