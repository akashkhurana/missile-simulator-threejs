/**
 * effects.js — Natural fire explosion, smoke, shockwave, debris, screen flash
 */

import * as THREE from 'three';
import { isMobile, randRange, randSphere } from './utils.js';

const FIRE_COUNT = isMobile() ? 60 : 150;
const SMOKE_COUNT = isMobile() ? 30 : 80;
const DEBRIS_COUNT = isMobile() ? 4 : 10;

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.explosions = [];
    this.shockwaves = [];
    this.debris = [];
    this.flashEl = document.getElementById('screen-flash');

    // Pre-create fire and smoke textures
    this.fireTexture = this._makeGlowTexture(64);
    this.smokeTexture = this._makeSmokeTexture(64);
  }

  _makeGlowTexture(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'rgba(255,255,200,1)');
    grad.addColorStop(0.2, 'rgba(255,200,50,0.8)');
    grad.addColorStop(0.5, 'rgba(255,100,0,0.4)');
    grad.addColorStop(0.8, 'rgba(200,30,0,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  _makeSmokeTexture(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const half = size / 2;
    // Draw soft blobs for smoke
    for (let i = 0; i < 5; i++) {
      const bx = half + (Math.random() - 0.5) * size * 0.3;
      const by = half + (Math.random() - 0.5) * size * 0.3;
      const br = size * 0.2 + Math.random() * size * 0.2;
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, 'rgba(80,80,80,0.4)');
      grad.addColorStop(0.5, 'rgba(60,60,60,0.2)');
      grad.addColorStop(1, 'rgba(40,40,40,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    return new THREE.CanvasTexture(canvas);
  }

  explode(position) {
    this._createFireParticles(position);
    this._createSmokeParticles(position);
    this._createShockwave(position);
    this._createDebris(position);
    this._createFlashLight(position);
    this._screenFlash();
  }

  smallExplosion(position) {
    this._createFireParticles(position, 25, 0.4);
    this._createSmokeParticles(position, 15, 0.4);
  }

  _createFireParticles(pos, count = FIRE_COUNT, scale = 1) {
    const sprites = [];

    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.fireTexture,
        transparent: true,
        opacity: randRange(0.7, 1),
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      // Color variation: yellow core → orange → dark red
      const phase = Math.random();
      if (phase < 0.3) {
        mat.color.setHSL(0.12, 1, 0.7); // bright yellow
      } else if (phase < 0.6) {
        mat.color.setHSL(0.07, 1, 0.5); // orange
      } else {
        mat.color.setHSL(0.02, 0.9, 0.35); // dark red
      }

      const sprite = new THREE.Sprite(mat);
      const s = randRange(2, 6) * scale;
      sprite.scale.set(s, s, 1);
      sprite.position.set(
        pos.x + randRange(-2, 2) * scale,
        pos.y + randRange(-2, 2) * scale,
        pos.z + randRange(-2, 2) * scale
      );
      this.scene.add(sprite);

      sprites.push({
        sprite,
        vel: randSphere(randRange(15, 60) * scale),
        age: 0,
        maxAge: randRange(0.5, 1.8),
        growRate: randRange(2, 6),
      });
    }

    this.explosions.push({ type: 'fire', particles: sprites });
  }

  _createSmokeParticles(pos, count = SMOKE_COUNT, scale = 1) {
    const sprites = [];

    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.smokeTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      mat.color.setHSL(0, 0, randRange(0.15, 0.35)); // dark grey smoke

      const sprite = new THREE.Sprite(mat);
      const s = randRange(1, 3) * scale;
      sprite.scale.set(s, s, 1);
      sprite.position.copy(pos);
      this.scene.add(sprite);

      sprites.push({
        sprite,
        vel: new THREE.Vector3(
          randRange(-8, 8) * scale,
          randRange(5, 25) * scale, // rises upward
          randRange(-8, 8) * scale
        ),
        age: 0,
        delay: randRange(0.2, 0.8), // smoke appears after fire
        maxAge: randRange(2, 4),
        growRate: randRange(4, 10),
      });
    }

    this.explosions.push({ type: 'smoke', particles: sprites });
  }

  _createFlashLight(pos) {
    const light = new THREE.PointLight(0xff6600, 10, 150);
    light.position.copy(pos);
    this.scene.add(light);
    this.explosions.push({
      type: 'light',
      light,
      age: 0,
      maxAge: 0.8,
    });
  }

  _createShockwave(pos) {
    const geo = new THREE.RingGeometry(0.5, 2, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffddaa,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(pos);
    ring.lookAt(pos.x, pos.y, pos.z + 1);
    this.scene.add(ring);

    this.shockwaves.push({ mesh: ring, age: 0, maxAge: 0.8, maxScale: 60 });
  }

  _createDebris(pos) {
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      const size = randRange(0.5, 2.5);
      const geo = new THREE.BoxGeometry(size, size * 0.3, size * 0.5);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0, 0, randRange(0.2, 0.5)),
        metalness: 0.6,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      this.debris.push({
        mesh,
        vel: randSphere(randRange(25, 70)),
        angVel: new THREE.Vector3(randRange(-8, 8), randRange(-8, 8), randRange(-8, 8)),
        age: 0,
        maxAge: 4,
      });
    }
  }

  _screenFlash() {
    if (!this.flashEl) return;
    this.flashEl.classList.add('active');
    setTimeout(() => this.flashEl.classList.remove('active'), 150);
  }

  update(dt) {
    // Update explosions (fire + smoke + lights)
    for (let e = this.explosions.length - 1; e >= 0; e--) {
      const exp = this.explosions[e];

      if (exp.type === 'fire') {
        let allDead = true;
        for (let i = exp.particles.length - 1; i >= 0; i--) {
          const p = exp.particles[i];
          p.age += dt;

          if (p.age >= p.maxAge) {
            this.scene.remove(p.sprite);
            p.sprite.material.dispose();
            exp.particles.splice(i, 1);
            continue;
          }
          allDead = false;

          const t = p.age / p.maxAge;
          // Move outward + slight upward drift
          p.sprite.position.x += p.vel.x * dt;
          p.sprite.position.y += p.vel.y * dt + dt * 5;
          p.sprite.position.z += p.vel.z * dt;
          p.vel.multiplyScalar(0.96); // drag

          // Grow
          const currentScale = p.sprite.scale.x + p.growRate * dt;
          p.sprite.scale.set(currentScale, currentScale, 1);

          // Fade out and shift color to dark red/black
          p.sprite.material.opacity = Math.max(0, (1 - t * t) * 0.9);
          p.sprite.material.color.lerp(new THREE.Color(0x220000), dt * 1.5);
        }
        if (allDead) this.explosions.splice(e, 1);
      }

      if (exp.type === 'smoke') {
        let allDead = true;
        for (let i = exp.particles.length - 1; i >= 0; i--) {
          const p = exp.particles[i];
          p.age += dt;

          if (p.age >= p.maxAge + p.delay) {
            this.scene.remove(p.sprite);
            p.sprite.material.dispose();
            exp.particles.splice(i, 1);
            continue;
          }

          // Delay before smoke appears
          if (p.age < p.delay) { allDead = false; continue; }
          allDead = false;

          const smokeAge = p.age - p.delay;
          const t = smokeAge / p.maxAge;

          // Rise and drift
          p.sprite.position.x += p.vel.x * dt;
          p.sprite.position.y += p.vel.y * dt;
          p.sprite.position.z += p.vel.z * dt;
          p.vel.x *= 0.98;
          p.vel.z *= 0.98;
          p.vel.y *= 0.995; // smoke rises longer

          // Grow
          const currentScale = p.sprite.scale.x + p.growRate * dt;
          p.sprite.scale.set(currentScale, currentScale, 1);

          // Fade in then out
          if (t < 0.15) {
            p.sprite.material.opacity = t / 0.15 * 0.5;
          } else {
            p.sprite.material.opacity = Math.max(0, 0.5 * (1 - (t - 0.15) / 0.85));
          }
        }
        if (allDead) this.explosions.splice(e, 1);
      }

      if (exp.type === 'light') {
        exp.age += dt;
        if (exp.age >= exp.maxAge) {
          this.scene.remove(exp.light);
          this.explosions.splice(e, 1);
          continue;
        }
        const t = exp.age / exp.maxAge;
        exp.light.intensity = 10 * (1 - t * t);
      }
    }

    // Shockwaves
    for (let s = this.shockwaves.length - 1; s >= 0; s--) {
      const sw = this.shockwaves[s];
      sw.age += dt;
      if (sw.age >= sw.maxAge) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        this.shockwaves.splice(s, 1);
        continue;
      }
      const t = sw.age / sw.maxAge;
      sw.mesh.scale.setScalar(1 + t * sw.maxScale);
      sw.mesh.material.opacity = 0.6 * (1 - t);
    }

    // Debris
    for (let d = this.debris.length - 1; d >= 0; d--) {
      const db = this.debris[d];
      db.age += dt;
      if (db.age >= db.maxAge) {
        this.scene.remove(db.mesh);
        db.mesh.geometry.dispose();
        db.mesh.material.dispose();
        this.debris.splice(d, 1);
        continue;
      }
      db.vel.y -= 15 * dt;
      db.mesh.position.add(db.vel.clone().multiplyScalar(dt));
      db.mesh.rotation.x += db.angVel.x * dt;
      db.mesh.rotation.y += db.angVel.y * dt;
      db.mesh.rotation.z += db.angVel.z * dt;
      const t = db.age / db.maxAge;
      db.mesh.material.opacity = 1 - t;
      db.mesh.material.transparent = true;
    }
  }
}
