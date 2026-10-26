import * as THREE from 'three';
import { carFactory, CAR_CONFIGS } from './CarFactory.js';
import { MathUtils } from '../utils/MathUtils.js';
import { sound } from '../game/AudioSystem.js';

export class PlayerCar {
  /**
   * @param {THREE.Scene} scene
   * @param {string} [carId='factory_gt']
   */
  constructor(scene, carId = 'factory_gt') {
    this.scene = scene;
    this.carId = carId;
    this.config = CAR_CONFIGS[carId] || CAR_CONFIGS['factory_gt'];

    // Identity & Leaderboard metrics
    this.racerId = 'player';
    this.name = 'Player (You)';
    this.isAI = false;
    this.color = this.config.color;
    this.completedLaps = 0;
    this.lapProgress = 0.0;
    this.currentCheckpointId = 'CP_0';
    this.nextCheckpointId = 'CP_1';
    this.isFinished = false;
    this.finishTimestamp = 0;
    this.totalRaceTime = 0;

    // Movement & Physics
    this.position = new THREE.Vector3(0, 0.35, -100);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.speed = 0; // m/s forward speed
    this.heading = 0; // Yaw angle in radians
    this.steeringAngle = 0; // Wheel turn angle

    // Handling & limits from config
    this.maxSpeed = this.config.maxSpeed || 62;
    this.maxReverseSpeed = -15;
    this.accelPower = this.config.acceleration || 28;
    this.brakePower = this.config.braking || 36;
    this.steerSensitivity = this.config.handling || 2.8;

    // Drift & grip state
    this.isDrifting = false;
    this.driftAngle = 0;
    this.driftScore = 0;
    this.wheelRotation = 0;

    // Combat & Shooting System State
    this.shield = 100;
    this.maxShield = 100;
    this.ammo = 30;
    this.maxAmmo = 50;
    this.weaponCooldown = 0;
    this.isShieldBroken = false;
    this.slowdownTimer = 0;
    this.recoveryTimer = 0;
    this.nitroTimer = 0;
    this.damageFlashTimer = 0;
    this.onFireCallback = null;

    // Input state
    this.inputs = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      handbrake: false,
      fire: false
    };

    // Safe recovery checkpoint position & heading
    this.lastSafeCheckpoint = {
      id: 'CP_0',
      position: this.position.clone(),
      heading: 0
    };

    // Visual model
    this.carData = carFactory.createCarModel(this.carId);
    this.mesh = this.carData.group;
    this.scene.add(this.mesh);

    // Particle system for drift smoke
    this.initSmokeParticles();

    // Event listener setup
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.bindControls();
  }

  bindControls() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  unbindControls() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.inputs = { forward: false, backward: false, left: false, right: false, handbrake: false, fire: false };
  }

  handleKeyDown(e) {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.inputs.forward = true;
        break;
      case 's':
      case 'arrowdown':
        this.inputs.backward = true;
        break;
      case 'a':
      case 'arrowleft':
        this.inputs.left = true;
        break;
      case 'd':
      case 'arrowright':
        this.inputs.right = true;
        break;
      case ' ':
        this.inputs.handbrake = true;
        break;
      case 'f':
        this.inputs.fire = true;
        if (this.onFireCallback) {
          this.onFireCallback();
        }
        break;
      case 'r':
        this.recoverToSafeCheckpoint();
        break;
    }
  }

  handleKeyUp(e) {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.inputs.forward = false;
        break;
      case 's':
      case 'arrowdown':
        this.inputs.backward = false;
        break;
      case 'a':
      case 'arrowleft':
        this.inputs.left = false;
        break;
      case 'd':
      case 'arrowright':
        this.inputs.right = false;
        break;
      case ' ':
        this.inputs.handbrake = false;
        break;
      case 'f':
        this.inputs.fire = false;
        break;
    }
  }

  initSmokeParticles() {
    const count = 30;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] = -100; // hide initially
      opacities[i] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const mat = new THREE.PointsMaterial({
      color: 0x8899aa,
      size: 1.4,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    this.smokeMesh = new THREE.Points(geo, mat);
    this.smokeMesh.frustumCulled = false;
    this.scene.add(this.smokeMesh);
    this.smokeParticles = Array.from({ length: count }, () => ({
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(0, 0, 0),
      life: 0
    }));
  }

  emitSmoke() {
    const rearLeft = this.position.clone().add(new THREE.Vector3(-0.9, 0.2, -1.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading));
    const rearRight = this.position.clone().add(new THREE.Vector3(0.9, 0.2, -1.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.heading));

    for (let p of this.smokeParticles) {
      if (p.life <= 0) {
        const origin = Math.random() > 0.5 ? rearLeft : rearRight;
        p.pos.copy(origin);
        p.vel.set((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2);
        p.life = 0.5;
        break;
      }
    }
  }

  updateSmoke(dt) {
    const posAttr = this.smokeMesh.geometry.attributes.position;
    for (let i = 0; i < this.smokeParticles.length; i++) {
      const p = this.smokeParticles[i];
      if (p.life > 0) {
        p.life -= dt;
        p.pos.addScaledVector(p.vel, dt);
        posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      } else {
        posAttr.setXYZ(i, 0, -100, 0);
      }
    }
    posAttr.needsUpdate = true;
  }

  update(dt, track, isRaceActive) {
    if (!dt || dt > 0.1) dt = 0.016; // protect against frame spikes

    // Update combat timers
    if (this.weaponCooldown > 0) this.weaponCooldown -= dt;
    if (this.slowdownTimer > 0) this.slowdownTimer -= dt;
    if (this.nitroTimer > 0) this.nitroTimer -= dt;

    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= dt;
      if (this.damageFlashTimer <= 0 && this.carData && this.carData.bodyMat) {
        this.carData.bodyMat.color.setHex(this.color);
      }
    }

    if (this.isShieldBroken) {
      this.recoveryTimer -= dt;
      if (this.recoveryTimer <= 0) {
        this.isShieldBroken = false;
        this.shield = this.maxShield;
        this.slowdownTimer = 0;
      }
    }

    if (isRaceActive && !this.isFinished) {
      this.totalRaceTime += dt;
      this.handleDrivingPhysics(dt, track);
    } else if (!isRaceActive) {
      // Natural rolling stop
      this.speed = MathUtils.damp(this.speed, 0, 4.0, dt);
    }

    // Update 3D transforms
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading + this.driftAngle;

    // Animate wheels
    this.animateWheels(dt);

    // Audio feedback
    const normSpeed = Math.abs(this.speed) / this.maxSpeed;
    sound.updateEngine(normSpeed, this.inputs.forward, this.isDrifting);

    // Smoke particles
    if (this.isDrifting && Math.abs(this.speed) > 10) {
      this.emitSmoke();
    }
    this.updateSmoke(dt);
  }

  handleDrivingPhysics(dt, track) {
    const isAccelerating = this.inputs.forward;
    const isBraking = this.inputs.backward;
    const isHandbrake = this.inputs.handbrake;

    // Brake lights visual
    this.carData.setBrakeLight(isBraking || isHandbrake);

    // Determine combat speed & acceleration modifiers
    let effectiveMaxSpeed = this.maxSpeed;
    let effectiveAccel = this.accelPower;

    if (this.nitroTimer > 0) {
      effectiveMaxSpeed *= 1.30;
      effectiveAccel *= 1.45;
    }
    if (this.isShieldBroken) {
      effectiveMaxSpeed *= 0.45; // 55% reduction on shield breakdown
      effectiveAccel *= 0.50;
    } else if (this.slowdownTimer > 0) {
      effectiveMaxSpeed *= 0.65; // 35% reduction on temporary hit
      effectiveAccel *= 0.70;
    }

    // 1. Acceleration & Braking
    if (isAccelerating) {
      if (this.speed < 0) {
        // Braking while in reverse
        this.speed += this.brakePower * dt;
      } else {
        // Forward acceleration curve (diminishes near top speed)
        const accelFactor = Math.max(0.2, 1.0 - (this.speed / effectiveMaxSpeed));
        this.speed += effectiveAccel * accelFactor * dt;
      }
    } else if (isBraking) {
      if (this.speed > 0.5) {
        // Braking
        this.speed -= this.brakePower * dt;
      } else {
        // Reverse
        this.speed -= this.accelPower * 0.5 * dt;
        if (this.speed < this.maxReverseSpeed) {
          this.speed = this.maxReverseSpeed;
        }
      }
    } else {
      // Rolling resistance
      const naturalDecel = isHandbrake ? 18.0 : 4.0;
      this.speed = MathUtils.damp(this.speed, 0, naturalDecel, dt);
    }

    // Top speed limit
    if (this.speed > effectiveMaxSpeed) {
      this.speed = MathUtils.damp(this.speed, effectiveMaxSpeed, 6.0, dt);
    }

    // 2. Steering & Drift
    let steerDir = 0;
    if (this.inputs.left) steerDir += 1;
    if (this.inputs.right) steerDir -= 1;

    // Steering sensitivity reduces with high speed for stability
    const speedRatio = Math.abs(this.speed) / this.maxSpeed;
    const speedSteerFactor = 1.0 - speedRatio * 0.45;
    const targetSteerAngle = steerDir * 0.48; // Max ~27 degrees
    this.steeringAngle = MathUtils.damp(this.steeringAngle, targetSteerAngle, 10.0, dt);

    // Drifting logic
    const wantsDrift = isHandbrake || (Math.abs(this.steeringAngle) > 0.3 && speedRatio > 0.45);
    if (wantsDrift && Math.abs(this.speed) > 12) {
      this.isDrifting = true;
      const targetDriftAngle = this.steeringAngle * 0.85;
      this.driftAngle = MathUtils.damp(this.driftAngle, targetDriftAngle, 5.0, dt);
      this.driftScore += Math.abs(this.driftAngle) * this.speed * dt * 10;
    } else {
      this.isDrifting = false;
      this.driftAngle = MathUtils.damp(this.driftAngle, 0, 8.0, dt);
    }

    // Turn vehicle heading based on speed and wheel angle
    if (Math.abs(this.speed) > 0.2) {
      const turnRate = this.steeringAngle * this.steerSensitivity * (this.speed > 0 ? 1 : -1) * speedSteerFactor;
      this.heading += turnRate * dt;
      this.heading = MathUtils.normalizeAngle(this.heading);
    }

    // 3. Position integration
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    const oldPos = this.position.clone();
    this.position.x += forwardX * this.speed * dt;
    this.position.z += forwardZ * this.speed * dt;

    // 4. Collision against track barriers
    if (track) {
      const col = track.checkBarrierCollision(this.position, 1.8);
      if (col.collided) {
        // Bounce recoil
        this.position.x += col.normal.x * col.penetration * 1.2;
        this.position.z += col.normal.y * col.penetration * 1.2;
        this.speed *= 0.5; // lose speed upon impact
      }
    }
  }

  animateWheels(dt) {
    // Wheel spin based on distance travelled: angular velocity = v / r
    const wheelRadius = 0.38;
    const rollAngleDelta = (this.speed * dt) / wheelRadius;
    this.wheelRotation += rollAngleDelta;

    for (const w of this.carData.wheels) {
      // Spin rolling mesh around X
      w.roller.rotation.x = this.wheelRotation;

      // Steer front wheels around Y
      if (w.isFront) {
        w.pivot.rotation.y = this.steeringAngle;
      }
    }
  }

  setSafeCheckpoint(cp) {
    this.lastSafeCheckpoint = {
      id: cp.id,
      position: cp.position.clone(),
      heading: Math.atan2(cp.forward.x, cp.forward.z)
    };
  }

  recoverToSafeCheckpoint() {
    this.position.copy(this.lastSafeCheckpoint.position);
    this.position.y = 0.35;
    this.heading = this.lastSafeCheckpoint.heading;
    this.speed = 0;
    this.driftAngle = 0;
    this.steeringAngle = 0;
    this.velocity.set(0, 0, 0);
  }

  takeDamage(amount = 20, attacker = null) {
    if (this.isShieldBroken) return { isBroken: true, shield: 0 };

    this.shield = Math.max(0, this.shield - amount);
    this.slowdownTimer = 1.5; // temporary hit slowdown

    // Visual flash
    this.damageFlashTimer = 0.25;
    if (this.carData && this.carData.bodyMat) {
      this.carData.bodyMat.color.setHex(0xff2222);
    }

    let isBroken = false;
    if (this.shield <= 0) {
      this.isShieldBroken = true;
      this.shield = 0;
      this.slowdownTimer = 3.5;
      this.recoveryTimer = 4.0;
      isBroken = true;
      sound.playShieldBreak();
    } else {
      sound.playImpact();
    }
    return { isBroken, shield: this.shield };
  }

  addAmmo(amount = 10) {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
    sound.playPickupSound();
  }

  repairShield(amount = 35) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
    if (this.isShieldBroken && this.shield > 0) {
      this.isShieldBroken = false;
      this.recoveryTimer = 0;
    }
    sound.playPickupSound();
  }

  applyNitro(duration = 3.5) {
    this.nitroTimer = duration;
    sound.playPickupSound();
  }

  resetCombat() {
    this.shield = this.maxShield;
    this.ammo = 30;
    this.weaponCooldown = 0;
    this.isShieldBroken = false;
    this.slowdownTimer = 0;
    this.recoveryTimer = 0;
    this.nitroTimer = 0;
    this.damageFlashTimer = 0;
    if (this.carData && this.carData.bodyMat) {
      this.carData.bodyMat.color.setHex(this.color);
    }
  }

  reset(startSlot) {
    this.position.copy(startSlot.position);
    this.heading = startSlot.rotationY;
    this.speed = 0;
    this.driftAngle = 0;
    this.driftScore = 0;
    this.steeringAngle = 0;
    this.completedLaps = 0;
    this.lapProgress = 0.0;
    this.currentCheckpointId = 'CP_0';
    this.nextCheckpointId = 'CP_1';
    this.isFinished = false;
    this.finishTimestamp = 0;
    this.totalRaceTime = 0;
    this.resetCombat();
    this.setSafeCheckpoint({ id: 'CP_0', position: startSlot.position, forward: startSlot.direction });
  }

  destroy() {
    this.unbindControls();
    if (this.mesh) this.scene.remove(this.mesh);
    if (this.smokeMesh) this.scene.remove(this.smokeMesh);
  }
}
