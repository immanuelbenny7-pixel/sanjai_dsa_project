import * as THREE from 'three';
import { MathUtils } from '../utils/MathUtils.js';

export class CameraController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   */
  constructor(camera) {
    this.camera = camera;
    this.target = null; // Target player car
    this.mode = 'chase'; // 'chase' | 'orbit' | 'cinematic'

    // Chase camera parameters
    this.distance = 7.5;
    this.height = 3.2;
    this.lookAtHeight = 1.4;
    this.baseFov = 65;

    // Smooth state
    this.currentPosition = new THREE.Vector3(0, 5, 10);
    this.currentLookAt = new THREE.Vector3(0, 0, 0);

    // Orbit parameters for Garage / Main Menu
    this.orbitAngle = 0;
    this.orbitRadius = 7.0;
    this.orbitHeight = 2.4;
    this.orbitSpeed = 0.35;

    // Camera shake
    this.shakeIntensity = 0;
  }

  setTarget(car) {
    this.target = car;
    if (car) {
      this.snapToTarget();
    }
  }

  snapToTarget() {
    if (!this.target) return;
    const forward = new THREE.Vector3(Math.sin(this.target.heading), 0, Math.cos(this.target.heading));
    this.currentPosition.copy(this.target.position)
      .addScaledVector(forward, -this.distance)
      .add(new THREE.Vector3(0, this.height, 0));
    this.currentLookAt.copy(this.target.position).add(new THREE.Vector3(0, this.lookAtHeight, 0));
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  triggerShake(amount = 0.3) {
    this.shakeIntensity = Math.min(1.0, this.shakeIntensity + amount);
  }

  update(dt) {
    if (!dt || dt > 0.1) dt = 0.016;

    if (this.mode === 'chase' && this.target) {
      this.updateChase(dt);
    } else if (this.mode === 'orbit') {
      this.updateOrbit(dt);
    }

    // Decay shake
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      const sy = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      this.camera.position.x += sx;
      this.camera.position.y += sy;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.5);
    }
  }

  updateChase(dt) {
    const carPos = this.target.position;
    const carHeading = this.target.heading;
    const carSpeed = this.target.speed || 0;

    // Dynamic FOV based on speed
    const speedRatio = Math.min(1.0, Math.abs(carSpeed) / 60);
    const targetFov = this.baseFov + speedRatio * 15;
    this.camera.fov = MathUtils.damp(this.camera.fov, targetFov, 3.0, dt);
    this.camera.updateProjectionMatrix();

    // Compute ideal camera position behind car
    const forwardX = Math.sin(carHeading);
    const forwardZ = Math.cos(carHeading);

    // Camera pulls back slightly at higher speeds
    const dynamicDist = this.distance + speedRatio * 1.5;
    const dynamicHeight = this.height + speedRatio * 0.5;

    const targetPos = new THREE.Vector3(
      carPos.x - forwardX * dynamicDist,
      carPos.y + dynamicHeight,
      carPos.z - forwardZ * dynamicDist
    );

    const targetLook = new THREE.Vector3(
      carPos.x + forwardX * 2.0,
      carPos.y + this.lookAtHeight,
      carPos.z + forwardZ * 2.0
    );

    // Smoothly interpolate position and lookAt (spring damping)
    this.currentPosition.x = MathUtils.damp(this.currentPosition.x, targetPos.x, 6.0, dt);
    this.currentPosition.y = MathUtils.damp(this.currentPosition.y, targetPos.y, 6.0, dt);
    this.currentPosition.z = MathUtils.damp(this.currentPosition.z, targetPos.z, 6.0, dt);

    this.currentLookAt.x = MathUtils.damp(this.currentLookAt.x, targetLook.x, 8.0, dt);
    this.currentLookAt.y = MathUtils.damp(this.currentLookAt.y, targetLook.y, 8.0, dt);
    this.currentLookAt.z = MathUtils.damp(this.currentLookAt.z, targetLook.z, 8.0, dt);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  updateOrbit(dt) {
    this.orbitAngle += this.orbitSpeed * dt;
    const lookCenter = new THREE.Vector3(0, 1.0, 0);

    this.camera.position.set(
      Math.sin(this.orbitAngle) * this.orbitRadius,
      this.orbitHeight,
      Math.cos(this.orbitAngle) * this.orbitRadius
    );
    this.camera.lookAt(lookCenter);
  }
}
