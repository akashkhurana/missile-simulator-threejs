/**
 * launcher.js — S-400 style TEL (Transporter Erector Launcher)
 * Features: 8-axle flatbed truck, 4 vertical missile canisters, radar dish
 */

import * as THREE from 'three';

export class Launcher {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.launchFlash = null;

    this._buildS400();
    scene.add(this.group);
  }

  _buildS400() {
    const matOlive = new THREE.MeshStandardMaterial({
      color: 0x4a5a3a,
      roughness: 0.85,
      metalness: 0.2,
    });
    const matDarkOlive = new THREE.MeshStandardMaterial({
      color: 0x3a4a2a,
      roughness: 0.85,
      metalness: 0.2,
    });
    const matMetal = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.4,
      metalness: 0.7,
    });
    const matTire = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const matCanister = new THREE.MeshStandardMaterial({
      color: 0x5a6a4a,
      roughness: 0.7,
      metalness: 0.3,
    });
    const matGlass = new THREE.MeshStandardMaterial({
      color: 0x6699aa,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.5,
    });

    // === CHASSIS / FLATBED ===
    // Main chassis beam
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(22, 1.2, 4),
      matOlive
    );
    chassis.position.set(0, 2, 0);
    this.group.add(chassis);

    // Side skirts
    for (let side = -1; side <= 1; side += 2) {
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(18, 0.6, 0.2),
        matDarkOlive
      );
      skirt.position.set(-1, 1.6, side * 2.1);
      this.group.add(skirt);
    }

    // === CAB ===
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(5, 3.5, 4.2),
      matOlive
    );
    cab.position.set(-9.5, 3.5, 0);
    this.group.add(cab);

    // Cab roof
    const cabRoof = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.3, 4.4),
      matDarkOlive
    );
    cabRoof.position.set(-9.5, 5.3, 0);
    this.group.add(cabRoof);

    // Windshield
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 2, 3.6),
      matGlass
    );
    windshield.position.set(-6.9, 3.8, 0);
    windshield.rotation.z = 0.15;
    this.group.add(windshield);

    // Side windows
    for (let side = -1; side <= 1; side += 2) {
      const sideWindow = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1.5, 0.1),
        matGlass
      );
      sideWindow.position.set(-9, 4, side * 2.15);
      this.group.add(sideWindow);
    }

    // === 8 AXLES (16 WHEELS) ===
    for (let i = 0; i < 8; i++) {
      const xPos = -8 + i * 2.5;
      for (let side = -1; side <= 1; side += 2) {
        // Outer tire
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 0.85, 0.5, 12),
          matTire
        );
        tire.rotation.x = Math.PI / 2;
        tire.position.set(xPos, 0.85, side * 2.6);
        this.group.add(tire);

        // Hub cap
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 0.55, 8),
          matMetal
        );
        hub.rotation.x = Math.PI / 2;
        hub.position.copy(tire.position);
        this.group.add(hub);
      }
    }

    // === 4 MISSILE CANISTERS (erected/angled) ===
    // S-400 style: rectangular canisters angled ~70-80 degrees
    const canisterGroup = new THREE.Group();
    canisterGroup.position.set(3, 3, 0);
    canisterGroup.rotation.z = Math.PI * 0.22; // ~40 degree elevation angle

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const canister = new THREE.Group();

        // Main tube
        const tube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.8, 0.8, 10, 8),
          matCanister
        );
        canister.add(tube);

        // End cap (top)
        const topCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 0.85, 0.3, 8),
          matDarkOlive
        );
        topCap.position.y = 5.15;
        canister.add(topCap);

        // End cap (bottom)
        const botCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 0.85, 0.3, 8),
          matDarkOlive
        );
        botCap.position.y = -5.15;
        canister.add(botCap);

        // Ribbing details (3 bands)
        for (let r = 0; r < 3; r++) {
          const rib = new THREE.Mesh(
            new THREE.CylinderGeometry(0.88, 0.88, 0.15, 8),
            matMetal
          );
          rib.position.y = -3 + r * 3;
          canister.add(rib);
        }

        const xOff = (col - 0.5) * 2;
        const zOff = (row - 0.5) * 2;
        canister.position.set(xOff, 0, zOff);
        canisterGroup.add(canister);
      }
    }

    this.group.add(canisterGroup);
    this.canisterGroup = canisterGroup;

    // === ERECTOR HYDRAULICS ===
    const hydraulic1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 5, 8),
      matMetal
    );
    hydraulic1.position.set(1, 4.5, 1.8);
    hydraulic1.rotation.z = 0.6;
    this.group.add(hydraulic1);

    const hydraulic2 = hydraulic1.clone();
    hydraulic2.position.z = -1.8;
    this.group.add(hydraulic2);

    // === EQUIPMENT BOX on platform ===
    const eqBox = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.5, 3),
      matDarkOlive
    );
    eqBox.position.set(-3, 3.5, 0);
    this.group.add(eqBox);

    // === RADAR MAST ===
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 4, 6),
      matMetal
    );
    mast.position.set(-4, 5.5, 0);
    this.group.add(mast);

    // Radar dish
    const radarDish = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 12, 8, 0, Math.PI),
      matMetal
    );
    radarDish.position.set(-4, 7.5, 0);
    radarDish.rotation.x = -Math.PI / 2;
    this.group.add(radarDish);
    this.radarDish = radarDish;

    // === LAUNCH FLASH ===
    this.launchFlash = new THREE.PointLight(0xff6600, 0, 50);
    this.launchFlash.position.set(6, 10, 0);
    this.group.add(this.launchFlash);

    // Scale and position
    this.group.position.set(0, 0, 0);
    this.group.scale.setScalar(1.8);
  }

  get position() {
    return this.group.position;
  }

  /** Missile spawn point — top of the canister tubes */
  getLaunchPoint() {
    return new THREE.Vector3(
      this.group.position.x + 10,
      this.group.position.y + 16,
      this.group.position.z
    );
  }

  triggerLaunchFlash() {
    if (this.launchFlash) {
      this.launchFlash.intensity = 10;
    }
  }

  update(dt) {
    // Rotate radar dish
    if (this.radarDish) {
      this.radarDish.rotation.y += dt * 1.2;
    }

    // Decay launch flash
    if (this.launchFlash && this.launchFlash.intensity > 0) {
      this.launchFlash.intensity *= 0.9;
      if (this.launchFlash.intensity < 0.1) this.launchFlash.intensity = 0;
    }
  }
}
