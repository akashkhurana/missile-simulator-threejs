/**
 * camera.js — Orbit camera with mouse-controlled rotation/zoom
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraSystem {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;

    // Initial position — slightly elevated, looking exactly North (-Z)
    this.camera.position.set(0, 30, 150);

    // Orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.5;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 600;
    this.controls.maxPolarAngle = Math.PI * 0.48; // prevent going below ground
    this.controls.minPolarAngle = Math.PI * 0.05;
    this.controls.target.set(0, 40, -50); // look towards the flight path
    this.controls.update();

    // Shake state
    this.shakeIntensity = 0;
    this.shakeDecay = 0;
    this.shakeOffset = new THREE.Vector3();
  }

  shake(intensity = 1.5) {
    this.shakeIntensity = intensity;
    this.shakeDecay = intensity;
  }

  update(dt) {
    this.controls.update();

    // Camera shake
    if (this.shakeDecay > 0) {
      this.shakeDecay -= dt * 6;
      const s = Math.max(this.shakeDecay, 0);
      this.shakeOffset.set(
        (Math.random() - 0.5) * s * 2,
        (Math.random() - 0.5) * s * 2,
        (Math.random() - 0.5) * s * 2
      );
      this.camera.position.add(this.shakeOffset);
    }
  }

  resetToDefault() {
    this.camera.position.set(0, 30, 150);
    this.controls.target.set(0, 40, -50);
    this.controls.update();
  }
}
