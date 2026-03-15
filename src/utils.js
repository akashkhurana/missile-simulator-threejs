/**
 * utils.js — Math utilities, PN algorithm, mobile detection
 */

import * as THREE from 'three';

/** Detect mobile device */
export function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    || window.innerWidth < 768;
}

/** Clamp value between min and max */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Lerp */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Smooth-damp (approximation) */
export function smoothDamp(current, target, velocity, smoothTime, dt) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  velocity = (velocity - omega * temp) * exp;
  return { value: target + (change + temp) * exp, velocity };
}

/**
 * Proportional Navigation guidance law
 * Returns commanded acceleration vector (perpendicular to missile velocity)
 *
 * @param {THREE.Vector3} missilePos
 * @param {THREE.Vector3} missileVel
 * @param {THREE.Vector3} targetPos
 * @param {THREE.Vector3} targetVel
 * @param {number} N — navigation constant (3-5)
 * @returns {THREE.Vector3} acceleration command
 */
export function proportionalNavigation(missilePos, missileVel, targetPos, targetVel, N = 4) {
  const los = new THREE.Vector3().subVectors(targetPos, missilePos);
  const losNorm = los.clone().normalize();

  // Relative velocity
  const relVel = new THREE.Vector3().subVectors(targetVel, missileVel);

  // Closing velocity (positive when closing)
  const closingVelocity = -relVel.dot(losNorm);

  // LOS rate: (V_rel × LOS_unit) / |LOS|
  const losRate = new THREE.Vector3().crossVectors(relVel, losNorm).divideScalar(los.length());

  // Commanded acceleration: N * Vc * LOS_rate_direction
  // a = N * Vc * (LOS_unit × LOS_rate_cross)
  const accel = new THREE.Vector3().crossVectors(losNorm, losRate).multiplyScalar(N * Math.max(closingVelocity, 10));

  return accel;
}

/**
 * Create a curved flight path for the aircraft
 * @returns {THREE.CatmullRomCurve3}
 */
export function createFlightPath() {
  const points = [
    new THREE.Vector3(-600, 95, -50),
    new THREE.Vector3(-300, 90, -70),
    new THREE.Vector3(0, 100, -80),
    new THREE.Vector3(300, 95, -60),
    new THREE.Vector3(600, 90, -50),
    new THREE.Vector3(900, 100, -70),
    new THREE.Vector3(1200, 95, -60),
  ];
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

/** Format number with leading zeros */
export function pad(n, width) {
  const s = String(Math.abs(Math.round(n)));
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

/** Random float in range */
export function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

/** Random Vector3 inside unit sphere */
export function randSphere(scale = 1) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * scale;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}
/** Smoothstep */
export function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}
