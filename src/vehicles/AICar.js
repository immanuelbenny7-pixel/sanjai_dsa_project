import * as THREE from 'three';
import { carFactory, CAR_CONFIGS } from './CarFactory.js';
import { MathUtils } from '../utils/MathUtils.js';
import { Dijkstra } from '../dsa/Dijkstra.js';

export class AICar {
  /**
   * @param {THREE.Scene} scene
   * @param {string} racerId 'apex' | 'nitro' | 'shadow'
   * @param {string} carId Car config ID
   * @param {Object} personality
   */
  constructor(scene, racerId, carId, personality = {}) {
    this.scene = scene;
    this.racerId = racerId;
    this.carId = carId;
    this.config = CAR_CONFIGS[carId] || CAR_CONFIGS['factory_gt'];
    this.personality = personality;

    // Identity
    this.name = personality.name || racerId.toUpperCase();
    this.isAI = true;
    this.color = this.config.color;

    // Leaderboard metrics
    this.completedLaps = 0;
    this.lapProgress = 0.0;
    this.currentCheckpointId = 'CP_0';
    this.nextCheckpointId = 'CP_1';
    this.isFinished = false;
    this.finishTimestamp = 0;
    this.totalRaceTime = 0;

    // Driving physics
    this.position = new THREE.Vector3(0, 0.35, -100);
    this.speed = 0;
    this.heading = 0;
    this.steeringAngle = 0;
    this.wheelRotation = 0;

    // Parameters tuned per personality
    this.maxSpeed = (this.config.maxSpeed || 60) * (personality.speedMult || 1.0);
    this.acceleration = (this.config.acceleration || 28) * (personality.accelMult || 1.0);
    this.corneringGrip = personality.corneringGrip || 0.85;
    this.lookaheadDist = personality.lookaheadDist || 14.0;
    this.routePreference = personality.routePreference || 'fastest'; // 'shortcut' | 'highway' | 'fastest'

    // Navigation & Dijkstra path
    this.plannedPath = [];
    this.pathIndex = 0;
    this.currentTargetPoint = new THREE.Vector3();

    // Stuck car recovery timer
    this.stuckTimer = 0;
    this.lastSafeCheckpoint = {
      id: 'CP_0',
      position: this.position.clone(),
      heading: 0
    };

    // Combat state
    this.shield = 100;
    this.maxShield = 100;
    this.ammo = 999;
    this.weaponCooldown = 0;
    this.isShieldBroken = false;
    this.slowdownTimer = 0;
    this.recoveryTimer = 0;
    this.nitroTimer = 0;
    this.damageFlashTimer = 0;

    // 3D Visual Mesh
    this.carData = carFactory.createCarModel(this.carId);
    this.mesh = this.carData.group;
    this.scene.add(this.mesh);
  }

  planRoute(track) {
    if (!track || !track.graph) return;

    // Use Dijkstra's algorithm from current checkpoint to finish line 'CP_0'
    const startNode = this.nextCheckpointId || this.currentCheckpointId || 'CP_0';
    const targetNode = 'CP_0';

    try {
      const result = Dijkstra.findShortestPath(track.graph, startNode, targetNode);
      if (result.found && result.path.length > 0) {
        this.plannedPath = [...result.path];
        this.pathIndex = 0;
      } else {
        // Fallback to sequential node traversal
        this.plannedPath = track.graph.getVertexIds();
        this.pathIndex = 0;
      }
    } catch (e) {
      console.warn(`AI ${this.name} route planning fallback:`, e);
      this.plannedPath = Object.keys(track.nodePositions);
      this.pathIndex = 0;
    }

    this.updateTargetWaypoint(track);
  }

  updateTargetWaypoint(track) {
    if (!track || !this.plannedPath || this.plannedPath.length === 0) return;

    const targetNodeId = this.plannedPath[this.pathIndex] || 'CP_0';
    const nodePos = track.nodePositions[targetNodeId];
    if (nodePos) {
      // Add a slight randomized lateral offset so AI racers don't drive in a single-file line
      const offset = (this.racerId === 'apex' ? -2.2 : (this.racerId === 'nitro' ? 2.2 : 0));
      this.currentTargetPoint.copy(nodePos);
      this.currentTargetPoint.x += offset;
    }
  }

  update(dt, track, isRaceActive, otherCars = []) {
    if (!dt || dt > 0.1) dt = 0.016;

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
      this.handleAIBehavior(dt, track, otherCars);
    } else if (!isRaceActive) {
      this.speed = MathUtils.damp(this.speed, 0, 4.0, dt);
    }

    // 3D transforms
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;

    // Animate wheels
    this.animateWheels(dt);
  }

  handleAIBehavior(dt, track, otherCars) {
    if (!track) return;

    // 1. Waypoint Navigation
    const distToTarget = MathUtils.distance2D(
      this.position.x, this.position.z,
      this.currentTargetPoint.x, this.currentTargetPoint.z
    );

    // If reached waypoint, advance to next node
    if (distToTarget < this.lookaheadDist) {
      this.pathIndex++;
      if (this.pathIndex >= this.plannedPath.length) {
        // Loop or re-plan route for new lap
        this.planRoute(track);
      } else {
        this.nextCheckpointId = this.plannedPath[this.pathIndex];
        this.updateTargetWaypoint(track);
      }
    }

    // 2. Compute steering angle towards target
    const dx = this.currentTargetPoint.x - this.position.x;
    const dz = this.currentTargetPoint.z - this.position.z;
    const targetAngle = Math.atan2(dx, dz);
    const angleDiff = MathUtils.normalizeAngle(targetAngle - this.heading);

    // Target steering
    const targetSteer = MathUtils.clamp(angleDiff * 1.5, -0.5, 0.5);
    this.steeringAngle = MathUtils.damp(this.steeringAngle, targetSteer, 8.0, dt);

    // 3. Speed & Cornering control with Combat Penalties
    let effectiveMaxSpeed = this.maxSpeed;
    if (this.nitroTimer > 0) {
      effectiveMaxSpeed *= 1.25;
    }
    if (this.isShieldBroken) {
      effectiveMaxSpeed *= 0.45; // 55% reduction on shield breakdown
    } else if (this.slowdownTimer > 0) {
      effectiveMaxSpeed *= 0.65; // 35% reduction on hit
    }

    const turnSeverity = Math.abs(angleDiff);
    let targetSpeed = effectiveMaxSpeed;

    if (turnSeverity > 0.4) {
      // Sharp turn
      targetSpeed *= this.corneringGrip * (1.0 - turnSeverity * 0.45);
    }

    // Obstacle / Other racer avoidance
    for (const other of otherCars) {
      if (other === this) continue;
      const d = this.position.distanceTo(other.position);
      if (d < 5.0) {
        // Yield or steer away slightly
        const avoidDir = this.position.x < other.position.x ? -0.15 : 0.15;
        this.steeringAngle += avoidDir;
        if (d < 3.0) targetSpeed *= 0.8;
      }
    }

    // Accelerate / Brake
    if (this.speed < targetSpeed) {
      this.speed += this.acceleration * dt;
      this.carData.setBrakeLight(false);
    } else {
      this.speed -= this.acceleration * 1.5 * dt;
      this.carData.setBrakeLight(true);
    }

    this.speed = MathUtils.clamp(this.speed, 0, effectiveMaxSpeed);

    // 4. Update heading
    const turnRate = this.steeringAngle * 2.5;
    this.heading += turnRate * dt;
    this.heading = MathUtils.normalizeAngle(this.heading);

    // 5. Integrate position
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;

    // 6. Barrier collision
    const col = track.checkBarrierCollision(this.position, 1.8);
    if (col.collided) {
      this.position.x += col.normal.x * col.penetration * 1.2;
      this.position.z += col.normal.y * col.penetration * 1.2;
      this.speed *= 0.6;
    }

    // 7. Stuck Recovery
    if (this.speed < 2.0) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 2.5) {
        this.recoverToSafeCheckpoint();
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }
  }

  animateWheels(dt) {
    const wheelRadius = 0.38;
    const rollAngleDelta = (this.speed * dt) / wheelRadius;
    this.wheelRotation += rollAngleDelta;

    for (const w of this.carData.wheels) {
      w.roller.rotation.x = this.wheelRotation;
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
    this.speed = 10.0; // Give initial forward momentum
    this.steeringAngle = 0;
  }

  takeDamage(amount = 20, attacker = null) {
    if (this.isShieldBroken) return { isBroken: true, shield: 0 };

    this.shield = Math.max(0, this.shield - amount);
    this.slowdownTimer = 1.5;

    this.damageFlashTimer = 0.25;
    if (this.carData && this.carData.bodyMat) {
      this.carData.bodyMat.color.setHex(0xff3333);
    }

    let isBroken = false;
    if (this.shield <= 0) {
      this.isShieldBroken = true;
      this.shield = 0;
      this.slowdownTimer = 3.5;
      this.recoveryTimer = 4.0;
      isBroken = true;
    }
    return { isBroken, shield: this.shield };
  }

  repairShield(amount = 35) {
    this.shield = Math.min(this.maxShield, this.shield + amount);
    if (this.isShieldBroken && this.shield > 0) {
      this.isShieldBroken = false;
      this.recoveryTimer = 0;
    }
  }

  applyNitro(duration = 3.5) {
    this.nitroTimer = duration;
  }

  resetCombat() {
    this.shield = this.maxShield;
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

  reset(startSlot, track) {
    this.position.copy(startSlot.position);
    this.heading = startSlot.rotationY;
    this.speed = 0;
    this.steeringAngle = 0;
    this.completedLaps = 0;
    this.lapProgress = 0.0;
    this.currentCheckpointId = 'CP_0';
    this.nextCheckpointId = 'CP_1';
    this.isFinished = false;
    this.finishTimestamp = 0;
    this.totalRaceTime = 0;
    this.stuckTimer = 0;
    this.resetCombat();
    this.setSafeCheckpoint({ id: 'CP_0', position: startSlot.position, forward: startSlot.direction });

    if (track) {
      this.planRoute(track);
    }
  }

  destroy() {
    if (this.mesh) this.scene.remove(this.mesh);
  }
}

