/**
 * missile.js — Missile model + pursuit-lead guidance + smoke trail
 */

import * as THREE from 'three';
import { isMobile, randRange } from './utils.js';

const SMOKE_COUNT = isMobile() ? 80 : 250;

export class Missile {
  constructor(scene, id = 0, launchPos = null) {
    this.scene = scene;
    this.id = id;
    this.group = new THREE.Group();
    this.alive = true;
    this.launched = false;
    this.hit = false;
    this.missed = false;

    // Physics
    this.speed = 45;          // Optimized for 5x slow-motion interceptions
    this.speedMultiplier = 1;
    this.age = 0;
    this.boostDuration = 0.6; // short vertical boost
    this.maxAge = 25;
    this.velocity = new THREE.Vector3(0, 1, 0); 

    // Launch position
    const lp = launchPos || new THREE.Vector3(0, 8, 60);
    this.group.position.copy(lp);

    this._buildModel();
    this._createSmokeTrail();
    scene.add(this.group);
  }

  _buildModel() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.8,
      roughness: 0.2,
    });

    // Body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 3.5, 8),
      mat
    );
    body.rotation.x = Math.PI / 2;
    this.group.add(body);

    // Tip
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.8, 8),
      mat
    );
    tip.position.z = -1.75 - 0.4;
    tip.rotation.x = -Math.PI / 2;
    this.group.add(tip);

    // Fins
    const finGeo = new THREE.BoxGeometry(0.05, 0.8, 0.5);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeo, mat);
      const angle = (i / 4) * Math.PI * 2;
      fin.position.set(Math.cos(angle) * 0.25, Math.sin(angle) * 0.25, 1.2);
      fin.rotation.z = angle;
      this.group.add(fin);
    }

    // Engine glow
    this.engineLight = new THREE.PointLight(0xff4400, 1, 10);
    this.engineLight.position.set(0, 0, 1.8);
    this.group.add(this.engineLight);
  }

  _createSmokeTrail() {
    const positions = new Float32Array(SMOKE_COUNT * 3);
    const alphas = new Float32Array(SMOKE_COUNT);
    const sizes = new Float32Array(SMOKE_COUNT);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float alpha;
        attribute float size;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float fade = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(0.85, 0.85, 0.8, vAlpha * fade);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.smokePoints = new THREE.Points(geo, mat);
    this.scene.add(this.smokePoints);

    this.smokeIndex = 0;
    this.smokeData = [];
    for (let i = 0; i < SMOKE_COUNT; i++) {
      this.smokeData.push({ life: 0, maxLife: 0, vel: new THREE.Vector3() });
    }
  }

  setSpeedMultiplier(m) {
    this.speedMultiplier = m;
  }

  launch() {
    this.launched = true;
    this.age = 0;
  }

  get position() {
    return this.group.position;
  }

  getSpeed() {
    return this.speed * this.speedMultiplier;
  }

  update(dt, targetPos, targetVel) {
    if (!this.alive || !this.launched) return;

    this.age += dt;
    if (this.age > this.maxAge) {
      this.missed = true;
      this.alive = false;
      return;
    }

    const currentSpeed = this.speed * this.speedMultiplier;

    // === GUIDANCE ===
    if (this.age < this.boostDuration) {
      // BOOST PHASE: go mostly upward but already start turning toward target
      const toTarget = new THREE.Vector3().subVectors(targetPos, this.group.position).normalize();
      const upBias = 1.0 - (this.age / this.boostDuration); // 1.0 → 0.0
      const desired = new THREE.Vector3(0, 1, 0).multiplyScalar(upBias).add(toTarget.multiplyScalar(1 - upBias)).normalize();
      this.velocity.lerp(desired, dt * 5);
      this.velocity.normalize();
    } else {
      // PURSUIT-LEAD GUIDANCE: aim at predicted intercept point
      const toTarget = new THREE.Vector3().subVectors(targetPos, this.group.position);
      const dist = toTarget.length();
      const timeToIntercept = dist / currentSpeed;

      // Lead the target: predict where it will be
      const leadPoint = targetPos.clone().add(targetVel.clone().multiplyScalar(timeToIntercept * 0.5)); // Reduced lead bias for slow speeds
      const desired = new THREE.Vector3().subVectors(leadPoint, this.group.position).normalize();

      // Steer toward desired direction — aggressive turn rate
      const turnRate = 8; // Higher turn rate to ensure hit at slow speeds
      this.velocity.lerp(desired, dt * turnRate);
      this.velocity.normalize();
    }

    // Move
    const moveVec = this.velocity.clone().multiplyScalar(currentSpeed * dt);
    this.group.position.add(moveVec);

    // Keep above ground
    if (this.group.position.y < 1) {
      this.group.position.y = 1;
      if (this.velocity.y < 0) this.velocity.y = 0.1;
      this.velocity.normalize();
    }

    // Orient along velocity
    const ahead = this.group.position.clone().add(this.velocity.clone().multiplyScalar(5));
    this.group.lookAt(ahead);

    // === HIT/MISS DETECTION ===
    const distToTarget = this.group.position.distanceTo(targetPos);

    // Hit: close enough
    if (distToTarget < 18 && this.age > this.boostDuration) { // Increased radius for slow motion
      this.hit = true;
      this.alive = false;
      return;
    }

    // Miss: flew past target and going away
    if (this.age > 4) {
      const toTgt = new THREE.Vector3().subVectors(targetPos, this.group.position).normalize();
      const dot = this.velocity.dot(toTgt);
      // If missile is pointing away from target and was once close
      if (dot < -0.3 && distToTarget > 30) {
        this.missed = true;
        this.alive = false;
        return;
      }
    }

    // Miss: too far away and old
    if (this.age > 8 && distToTarget > 300) {
      this.missed = true;
      this.alive = false;
      return;
    }

    // Engine flicker
    if (this.engineLight) {
      this.engineLight.intensity = 1.5 + Math.random() * 1;
    }
    if (this.flame) {
      this.flame.scale.y = 0.8 + Math.random() * 0.4;
    }

    this._emitSmoke(dt);
  }

  _emitSmoke(dt) {
    const posAttr = this.smokePoints.geometry.attributes.position;
    const alphaAttr = this.smokePoints.geometry.attributes.alpha;
    const sizeAttr = this.smokePoints.geometry.attributes.size;

    const emitCount = 3;
    for (let e = 0; e < emitCount; e++) {
      const i = this.smokeIndex % SMOKE_COUNT;
      posAttr.array[i * 3] = this.group.position.x + randRange(-0.5, 0.5);
      posAttr.array[i * 3 + 1] = this.group.position.y + randRange(-0.5, 0.5);
      posAttr.array[i * 3 + 2] = this.group.position.z + randRange(-0.5, 0.5);
      alphaAttr.array[i] = 0.8;
      sizeAttr.array[i] = randRange(2, 4);
      this.smokeData[i].life = 0;
      this.smokeData[i].maxLife = randRange(1.5, 3);
      this.smokeData[i].vel.set(randRange(-2, 2), randRange(-1, 2), randRange(-2, 2));
      this.smokeIndex++;
    }

    for (let i = 0; i < SMOKE_COUNT; i++) {
      const d = this.smokeData[i];
      if (d.maxLife <= 0) continue;
      d.life += dt;
      const t = d.life / d.maxLife;
      if (t >= 1) {
        alphaAttr.array[i] = 0;
        continue;
      }
      posAttr.array[i * 3] += d.vel.x * dt;
      posAttr.array[i * 3 + 1] += d.vel.y * dt;
      posAttr.array[i * 3 + 2] += d.vel.z * dt;
      alphaAttr.array[i] = 0.6 * (1 - t);
      sizeAttr.array[i] += dt * 3;
    }

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  getDistanceTo(target) {
    return this.group.position.distanceTo(target);
  }

  getTimeTo(target) {
    const dist = this.getDistanceTo(target);
    const speed = this.speed * this.speedMultiplier;
    return speed > 0 ? dist / speed : 99;
  }

  dispose() {
    this.group.visible = false;
    this.alive = false;
    setTimeout(() => {
      this.scene.remove(this.group);
      this.scene.remove(this.smokePoints);
      this.smokePoints.geometry.dispose();
      this.smokePoints.material.dispose();
    }, 4000);
  }
}
