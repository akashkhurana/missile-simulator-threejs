/**
 * scene.js — Three.js scene setup: sky, ground, lighting, clouds
 */

import * as THREE from 'three';
import { isMobile, randRange, smoothstep } from './utils.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.clouds = [];
  }

  init() {
    this._createSky();
    this._createLighting();
    this._createGround();
    this._createGeology();
    this._createBaseStructure();
    this._createRadarStations();
    this._createEnvironmentObjects();
    this._createClouds();
    return this.scene;
  }

  _getTerrainHeight(x, z) {
    // Rolling hills using sine waves
    const h1 = Math.sin(x * 0.005) * Math.cos(z * 0.005) * 15;
    const h2 = Math.sin(x * 0.02 + z * 0.01) * 3;
    const h3 = Math.sin(x * 0.01 - z * 0.02) * 5;
    
    // Flatness near the base camp (radius 60)
    const dist = Math.sqrt(x*x + z*z);
    const baseFactor = smoothstep(0, 70, dist); // 0 at center, 1 at 70 units
    
    return (h1 + h2 + h3) * baseFactor;
  }

  _createBaseStructure() {
    // 1. Concrete Pad for launcher
    const padGeo = new THREE.BoxGeometry(40, 0.4, 40);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.2;
    this.scene.add(pad);

    // 2. Perimeter Fencing
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
    const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 3);
    const railGeo = new THREE.BoxGeometry(6, 0.1, 0.1);

    for (let i = 0; i < 4; i++) {
        const sideGroup = new THREE.Group();
        for (let j = -3; j <= 3; j++) {
            const post = new THREE.Mesh(postGeo, fenceMat);
            post.position.set(j * 6, 1.5, 0);
            sideGroup.add(post);

            if (j < 3) {
                const rail1 = new THREE.Mesh(railGeo, fenceMat);
                rail1.position.set(j * 6 + 3, 1.0, 0);
                sideGroup.add(rail1);
                const rail2 = rail1.clone();
                rail2.position.y = 2.5;
                sideGroup.add(rail2);
            }
        }
        const angle = i * Math.PI / 2;
        sideGroup.position.set(Math.cos(angle) * 22, 0, Math.sin(angle) * 22);
        sideGroup.rotation.y = -angle + Math.PI/2;
        this.scene.add(sideGroup);
    }

    // 3. Support Trucks and Ground Crew
    this._createTruck(-15, -12, Math.PI * 0.2, 'radar');
    this._createTruck(15, -15, -Math.PI * 0.1, 'cargo');
    
    this._createHuman(-8, 5);
    this._createHuman(-10, 6);
    this._createHuman(12, 8);

    // 4. Missile Crates
    for (let i = 0; i < 6; i++) {
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(4, 1.2, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x3d3d32 })
        );
        crate.position.set(10 + (i % 2) * 5, 0.6, 12 + Math.floor(i/2) * 2);
        crate.rotation.y = Math.random() * 0.2;
        this.scene.add(crate);
    }
  }

  _createRadarStations() {
    // Add distant radar towers on hilltops
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
    const positions = [
        { x: -600, z: -800 },
        { x: 700, z: -500 },
        { x: -300, z: 1200 }
    ];

    positions.forEach(p => {
        const y = this._getTerrainHeight(p.x, p.z);
        const group = new THREE.Group();
        
        // Lattice tower
        const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 5, 40, 4), towerMat);
        base.position.y = 20;
        group.add(base);

        // Rotating dish
        const dish = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12, 0, Math.PI), towerMat);
        dish.position.y = 45;
        dish.rotation.x = -Math.PI / 2;
        group.add(dish);

        group.position.set(p.x, y, p.z);
        this.scene.add(group);
        
        // Store for animation
        if (!this.radarTowers) this.radarTowers = [];
        this.radarTowers.push(dish);
    });
  }

  _createTruck(x, z, rot, type) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a4a2a });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 3), bodyMat);
    chassis.position.y = 1;
    group.add(chassis);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 2.8), bodyMat);
    cab.position.set(2.8, 2, 0);
    group.add(cab);

    if (type === 'radar') {
        const dish = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI), darkMat);
        dish.position.set(-2, 3, 0);
        dish.rotation.x = -Math.PI / 4;
        group.add(dish);
    } else {
        const cargo = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 2.8), bodyMat);
        cargo.position.set(-1.5, 2.2, 0);
        group.add(cargo);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rot;
    this.scene.add(group);
  }

  _createHuman(x, z) {
    const group = new THREE.Group();
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x223344 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.3), clothMat);
    body.position.y = 0.8;
    group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), skinMat);
    head.position.y = 1.6;
    group.add(head);

    group.position.set(x, 0, z);
    group.scale.setScalar(1.2);
    this.scene.add(group);
  }

  _createGeology() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
    for (let i = 0; i < 80; i++) {
        const size = randRange(1, 5);
        const geo = new THREE.IcosahedronGeometry(size, 0);
        const rock = new THREE.Mesh(geo, rockMat);
        const px = randRange(-1000, 1000);
        const pz = randRange(-1000, 1000);
        const py = this._getTerrainHeight(px, pz);
        rock.position.set(px, py + size * 0.3, pz);
        if (rock.position.length() < 50) continue;
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        this.scene.add(rock);
    }

    const bushMat = new THREE.MeshStandardMaterial({ color: 0x1a330a });
    for (let i = 0; i < 150; i++) {
        const bush = new THREE.Group();
        const size = randRange(1, 3);
        for (let j = 0; j < 3; j++) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(size), bushMat);
            leaf.position.set(randRange(-0.5, 0.5), randRange(0, 0.5), randRange(-0.5, 0.5));
            bush.add(leaf);
        }
        const px = randRange(-800, 800);
        const pz = randRange(-800, 800);
        const py = this._getTerrainHeight(px, pz);
        bush.position.set(px, py + 0.5, pz);
        if (bush.position.length() < 40) continue;
        this.scene.add(bush);
    }
  }

  _createEnvironmentObjects() {
    const treeCount = isMobile() ? 20 : 80;
    for (let i = 0; i < treeCount; i++) {
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.6, 4);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);

        const foliageGeo = new THREE.ConeGeometry(2.5, 8, 6);
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x142c0c });
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = 4.5;

        const tree = new THREE.Group();
        tree.add(trunk);
        tree.add(foliage);
        
        const px = randRange(-1200, 1200);
        const pz = randRange(-1200, 1200);
        const py = this._getTerrainHeight(px, pz);
        tree.position.set(px, py + 2, pz);
        
        if (tree.position.length() < 70) continue;
        
        tree.scale.setScalar(randRange(1, 2.5));
        this.scene.add(tree);
    }
  }

  _createSky() {
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.7);
    this.scene.add(hemiLight);

    const skyGeo = new THREE.SphereGeometry(2500, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1a7fb4) },
        bottomColor: { value: new THREE.Color(0xa4dcfa) },
        offset: { value: 30 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));
    this.scene.fog = new THREE.FogExp2(0xa4dcfa, 0.0004);
  }

  _createLighting() {
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.2);
    sun.position.set(300, 500, 200);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x87ceeb, 0.7);
    fill.position.set(-200, 300, -200);
    this.scene.add(fill);
  }

  _createGround() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Grass Base (Dark)
    ctx.fillStyle = '#1b3012';
    ctx.fillRect(0, 0, 1024, 1024);

    // Agricultural Patchwork Fields
    const fieldColors = ['#2d4c1e', '#3d5a2c', '#4d6a3c', '#253a15'];
    for (let i = 0; i < 40; i++) {
        ctx.fillStyle = fieldColors[Math.floor(Math.random() * fieldColors.length)];
        const fw = 100 + Math.random() * 200;
        const fh = 100 + Math.random() * 200;
        ctx.fillRect(Math.random()*1024, Math.random()*1024, fw, fh);
    }

    // Dirt Roads with Tire Tracks
    ctx.strokeStyle = 'rgba(100, 85, 60, 0.7)';
    ctx.lineWidth = 30;
    const roads = [[512, 0], [512, 1024], [0, 512], [1024, 512]];
    roads.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(r[0], r[1]);
        ctx.lineTo(512, 512);
        ctx.stroke();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    // Rolling Hills Geometry (Vertex Displacement)
    const segments = isMobile() ? 64 : 128;
    const groundGeo = new THREE.PlaneGeometry(5000, 5000, segments, segments);
    const verts = groundGeo.attributes.position.array;
    for (let i = 0; i < verts.length; i += 3) {
        const x = verts[i];
        const z = verts[i + 1]; // PlaneGeometry is XY, and we rotate later
        verts[i + 2] = this._getTerrainHeight(x, -z);
    }
    groundGeo.computeVertexNormals();

    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ map: texture, roughness: 1.0 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
  }

  _createClouds() {
    const count = isMobile() ? 10 : 25;
    const _makeCloudTex = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      for (let b = 0; b < 7; b++) {
        const bx = 40 + Math.random() * 176;
        const by = 30 + Math.random() * 68;
        const br = 30 + Math.random() * 50;
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0, `rgba(255,255,255,0.7)`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      return new THREE.CanvasTexture(canvas);
    };

    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: _makeCloudTex(), transparent: true, opacity: randRange(0.4, 0.9), depthWrite: false }));
      const scale = randRange(150, 400);
      sprite.scale.set(scale * 3, scale * 1.0, 1);
      sprite.position.set(randRange(-1500, 1500), randRange(400, 700), randRange(-1500, 500));
      this.scene.add(sprite);
      this.clouds.push({ sprite, speed: randRange(2, 8) });
    }
  }

  update(dt) {
    for (const c of this.clouds) {
      c.sprite.position.x += c.speed * dt;
      if (c.sprite.position.x > 2000) c.sprite.position.x = -2000;
    }
    if (this.radarTowers) {
        this.radarTowers.forEach(t => t.rotation.y += dt * 0.8);
    }
  }
}
