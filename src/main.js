/**
 * main.js — Entry point: init renderer, scene, game loop
 */

import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { Aircraft } from './aircraft.js';
import { Launcher } from './launcher.js';
import { CameraSystem } from './camera.js';
import { EffectsManager } from './effects.js';
import { HUD } from './hud.js';
import { Simulation } from './simulation.js';
import { Controls } from './controls.js';
import { isMobile } from './utils.js';

class App {
  constructor() {
    this.clock = new THREE.Clock();
    this.init();
  }

  init() {
    // Renderer
    const container = document.getElementById('canvas-container');
    const pixelRatio = isMobile() ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobile(),
      alpha: false,
    });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );

    // Scene
    this.sceneManager = new SceneManager();
    this.scene = this.sceneManager.init();

    // Aircraft
    this.aircraft = new Aircraft(this.scene);

    // Launcher
    this.launcher = new Launcher(this.scene);

    // Camera system (orbit controls)
    this.cameraSystem = new CameraSystem(this.camera, this.renderer);

    // Effects
    this.effects = new EffectsManager(this.scene);

    // HUD
    this.hud = new HUD();

    // Simulation
    this.simulation = new Simulation(
      this.scene,
      this.aircraft,
      this.launcher,
      this.cameraSystem,
      this.effects,
      this.hud
    );

    // Controls
    this.controls = new Controls(this.simulation);

    // Resize handler
    window.addEventListener('resize', () => this._onResize());

    // Initial status
    this.hud.showStatus('MISSILE SIMULATOR ONLINE', 'normal');

    // Start loop
    this._animate();
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    // Update systems
    this.sceneManager.update(dt);
    this.aircraft.update(dt);
    this.launcher.update(dt);
    this.simulation.update(dt);
    this.effects.update(dt);
    this.controls.update();

    // HUD aircraft data
    this.hud.updateAircraft(
      Math.round(this.aircraft.getAltitude()),
      Math.round(this.aircraft.getSpeed()),
      Math.round(this.aircraft.getHeading())
    );

    // Render
    this.renderer.render(this.scene, this.camera);
  }
}

// Bootstrap
new App();
