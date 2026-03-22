/**
 * aircraft.js — Geometric F-16 model + flight path + banking
 */

import * as THREE from 'three';
import { createFlightPath, lerp, randRange } from './utils.js';

export class Aircraft {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.path = createFlightPath();
    this.t = 0;              // parametric position on path [0,1]
    this.speed = 0.006;       // Extremely slow cinematic pace (1/5th previous)
    this.velocity = new THREE.Vector3();
    this.prevPos = new THREE.Vector3();
    this.evasionOffset = new THREE.Vector3();
    this.evasionPhase = 0;
    this.destroyed = false;
    this.crashing = false;
    this.visible = true;

    this._buildModel();
    scene.add(this.group);
  }

  _buildModel() {
    this.model = new THREE.Group();
    this.group.add(this.model);

    const mat = new THREE.MeshToonMaterial({
      color: 0xff0055, // Vivid hot pink/red
    });
    const matDark = new THREE.MeshToonMaterial({
      color: 0xaa0033, // Darker crimson
    });
    const matGlass = new THREE.MeshToonMaterial({
      color: 0x00ffff, // Bright cyan window
      transparent: true,
      opacity: 0.9,
    });

    // Fuselage
    this.fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.2, 12, 8),
      mat
    );
    this.fuselage.rotation.z = Math.PI / 2;
    this.model.add(this.fuselage);

    // Nose cone
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 4, 8),
      mat
    );
    nose.rotation.z = -Math.PI / 2;
    nose.position.x = 8;
    this.model.add(nose);

    // Canopy
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      matGlass
    );
    canopy.position.set(2, 1, 0);
    canopy.scale.set(1, 0.5, 0.6);
    this.model.add(canopy);

    // Main wings
    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
       0, 0,  0,
      -4, 0,  0,
      -2, 0, -8,
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeo.computeVertexNormals();

    const wingL = new THREE.Mesh(wingGeo, mat);
    this.model.add(wingL);

    const wingR = wingL.clone();
    wingR.scale.z = -1;
    this.model.add(wingR);

    // Tail fins
    const tailFin = new THREE.Mesh(
      new THREE.BoxGeometry(2, 3, 0.2),
      matDark
    );
    tailFin.position.set(-5.5, 1.5, 0);
    tailFin.rotation.z = -0.2;
    this.model.add(tailFin);

    // Horizontal tail
    const hTailGeo = new THREE.BufferGeometry();
    const hTailVerts = new Float32Array([
       0, 0,  0,
      -2, 0,  0,
      -1, 0, -3,
    ]);
    hTailGeo.setAttribute('position', new THREE.BufferAttribute(hTailVerts, 3));
    hTailGeo.computeVertexNormals();

    const hTailL = new THREE.Mesh(hTailGeo, matDark);
    hTailL.position.set(-5, 0, 0);
    this.model.add(hTailL);

    const hTailR = hTailL.clone();
    hTailR.scale.z = -1;
    this.model.add(hTailR);

    // Intake
    const intake = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.8, 1.5),
      matDark
    );
    intake.position.set(1, -1.2, 0);
    this.model.add(intake);

    // Engine exhaust glow
    const exhaustLight = new THREE.PointLight(0xff6600, 0.5, 15);
    exhaustLight.position.set(-7, 0, 0);
    this.model.add(exhaustLight);
    this.exhaustLight = exhaustLight;

    // Fire glow (initially off)
    this.fireLight = new THREE.PointLight(0xff3300, 0, 30);
    this.group.add(this.fireLight);

    // IMPORTANT: Rotate model so nose (which is along +X) points along +Z for lookAt
    this.model.rotation.y = -Math.PI / 2;

    this.group.scale.setScalar(1.5);
  }

  get position() {
    return this.group.position;
  }

  getVelocity() {
    return this.velocity.clone();
  }

  getSpeed() {
    return this.velocity.length() * 100;
  }

  getAltitude() {
    return this.group.position.y;
  }

  getHeading() {
    const dir = this.velocity.clone().normalize();
    let angle = Math.atan2(dir.x, dir.z) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  }

  reset() {
    this.t = 0;
    this.destroyed = false;
    this.crashing = false;
    this.visible = true;
    this.group.visible = true;
    this.evasionPhase = 0;
    this.evasionOffset.set(0, 0, 0);
    this.prevPos.copy(this.path.getPoint(0));
    this.group.position.copy(this.prevPos);
    this.group.rotation.set(0, 0, 0);
    this.fireLight.intensity = 0;
    this.fuselage.material.emissive.setHex(0x000000);
  }

  hit() {
    if (this.crashing) return;
    this.crashing = true;
    this.fireLight.intensity = 5;
    this.fuselage.material.emissive.setHex(0xff3300);
  }

  destroy() {
    this.destroyed = true;
    this.group.visible = false;
  }

  update(dt) {
    if (this.destroyed) return false;

    this.prevPos.copy(this.group.position);

    if (this.crashing) {
      // Lose altitude and tilt nose down
      this.group.position.y -= dt * 12; // Slower fall (1/5th of 60)
      this.group.position.add(this.velocity.clone().multiplyScalar(dt * 0.5)); 
      
      this.group.rotation.x += dt * 0.5;
      this.group.rotation.z += dt * 1.5; // More intense spiral for visuals
      
      this.fireLight.intensity = 5 + Math.random() * 2;

      // Ground impact check
      if (this.group.position.y <= 2) {
        this.destroy();
        return true; // Impact
      }
    } else {
      this.t += this.speed * dt;

      if (this.t >= 1) {
        this.t = 0;
        this.evasionPhase = 0;
        this.prevPos.copy(this.path.getPoint(0));
      }

      const basePos = this.path.getPoint(this.t);

      // Steady flight with very minimal jinking
      this.evasionPhase += dt * 0.5;
      this.evasionOffset.set(
        Math.sin(this.evasionPhase * 1.3) * 0.5,
        Math.sin(this.evasionPhase * 0.9) * 0.3,
        Math.cos(this.evasionPhase * 1.1) * 0.5
      );

      this.group.position.copy(basePos).add(this.evasionOffset);
      this.velocity.subVectors(this.group.position, this.prevPos).divideScalar(Math.max(dt, 0.001));

      // Look along flight path
      const tangent = this.path.getTangent(this.t);
      const lookTarget = this.group.position.clone().add(tangent.multiplyScalar(10));
      this.group.lookAt(lookTarget);

      const bankAmount = Math.sin(this.evasionPhase * 1.3) * 0.1;
      this.model.rotation.z = bankAmount; 
    }

    if (this.exhaustLight) {
      this.exhaustLight.intensity = 0.4 + Math.random() * 0.3;
    }
    return false;
  }
}
