import * as THREE from 'three';
import { ProjectilePool } from '../dsa/ProjectilePool.js';
import { Projectile } from './Projectile.js';
import { ImpactEffectManager } from './ImpactEffectManager.js';
import { ShieldBar3D } from './ShieldBar3D.js';
import { sound } from '../game/AudioSystem.js';

/**
 * Combat System for Street Racer: Algorithm Wars
 * Manages 3D weapon firing, projectile lifecycle via Object Pool,
 * real-time ray/sphere collision detection, damage and shield breakdown.
 */
export class CombatSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../game/Track.js').Track} track
   * @param {import('../vehicles/PlayerCar.js').PlayerCar} [playerCar]
   * @param {Array<import('../vehicles/AICar.js').AICar>} [aiCars]
   * @param {Object} [options]
   */
  constructor(scene, track, playerCar = null, aiCars = [], options = {}) {
    this.scene = scene;
    this.track = track;
    this.playerCar = playerCar;
    this.aiCars = Array.isArray(aiCars) ? aiCars : [];
    this.allCars = [];
    if (this.playerCar) this.allCars.push(this.playerCar);
    if (this.aiCars.length > 0) this.allCars.push(...this.aiCars);

    this.onHit = null;
    this.onHitCallback = options.onHit || null;
    this.onShieldBreakCallback = options.onShieldBreak || null;

    // 1. DSA Component: Pre-allocated Projectile Object Pool
    this.projectilePool = new ProjectilePool((poolId) => {
      return new Projectile(this.scene, poolId);
    }, 40, 80);
    this.pool = this.projectilePool; // alias

    // 2. 3D Impact Visual Effects (sparks, shockwaves, muzzle flashes)
    this.effects = new ImpactEffectManager(this.scene);

    // 3. 3D Floating Shield Bars for each vehicle
    this.shieldBars = new Map();
    this.initShieldBars();

    // Weapon Configuration
    this.config = {
      playerCooldown: 0.35, // 0.35s between shots
      projectileDamage: 20, // 20 points per hit
      projectileSpeed: 130.0,
      hitRadius: 1.8 // Collision sphere threshold
    };
  }

  registerCar(car) {
    if (!car) return;
    if (car.isAI) {
      if (!this.aiCars.includes(car)) this.aiCars.push(car);
    } else {
      this.playerCar = car;
    }

    if (!this.allCars.includes(car)) {
      this.allCars.push(car);
    }

    if (car.mesh && !this.shieldBars.has(car.racerId)) {
      const shieldBar = new ShieldBar3D(this.scene, car.mesh, {
        heightOffset: car.isAI ? 2.1 : 2.2,
        width: 2.3
      });
      this.shieldBars.set(car.racerId, shieldBar);
    }
  }

  initShieldBars() {
    this.allCars.forEach(car => {
      if (car && car.mesh && !this.shieldBars.has(car.racerId)) {
        const shieldBar = new ShieldBar3D(this.scene, car.mesh, {
          heightOffset: car.isAI ? 2.1 : 2.2,
          width: 2.3
        });
        this.shieldBars.set(car.racerId, shieldBar);
      }
    });
  }

  /**
   * Player trigger firing an energy bolt
   * @returns {boolean} Whether shot was successfully fired
   */
  firePlayerWeapon() {
    if (!this.playerCar) return false;

    // 1. Check ammunition & cooldown
    if (this.playerCar.ammo <= 0) {
      console.log('[Combat] Ammo empty!');
      return false;
    }

    if (this.playerCar.weaponCooldown > 0) {
      return false;
    }

    // 2. Check if car can fire (e.g. not shield-broken)
    if (this.playerCar.isShieldBroken) {
      return false;
    }

    // 3. Acquire projectile from Object Pool in O(1) time
    const projectile = this.pool.acquire();
    if (!projectile) {
      console.warn('[Combat] Failed to acquire projectile from pool.');
      return false;
    }

    // 4. Calculate muzzle position at the hood/front bumper
    const forwardX = Math.sin(this.playerCar.heading);
    const forwardZ = Math.cos(this.playerCar.heading);
    const muzzlePos = this.playerCar.position.clone().add(
      new THREE.Vector3(forwardX * 2.2, 0.55, forwardZ * 2.2)
    );

    // 5. Launch projectile into 3D world
    projectile.launch(this.playerCar, muzzlePos, this.playerCar.heading, {
      isAI: false,
      damage: this.config.projectileDamage,
      speed: this.config.projectileSpeed
    });

    // 6. Visual muzzle flash + sound
    this.effects.spawnMuzzleFlash(muzzlePos, 0x00f0ff);
    sound.playLaserShoot(false);

    // 7. Update player weapon state
    this.playerCar.ammo = Math.max(0, this.playerCar.ammo - 1);
    this.playerCar.weaponCooldown = this.config.playerCooldown;

    return true;
  }

  /**
   * AI opponent firing evaluation
   * Checks if an opponent has a clear shot at the player or rivals ahead
   * @param {import('../vehicles/AICar.js').AICar} aiCar
   * @param {number} dt
   */
  updateAIFiring(aiCar, dt) {
    if (!aiCar || aiCar.isShieldBroken) return;

    if (aiCar.weaponCooldown > 0) {
      aiCar.weaponCooldown -= dt;
      return;
    }

    // Check distance and angle to player car
    const dx = this.playerCar.position.x - aiCar.position.x;
    const dz = this.playerCar.position.z - aiCar.position.z;
    const distSq = dx * dx + dz * dz;

    // Fire range: between 8 meters and 65 meters ahead
    if (distSq > 64 && distSq < 4225) {
      // Evaluate if player is in front arc
      const carForwardX = Math.sin(aiCar.heading);
      const carForwardZ = Math.cos(aiCar.heading);

      const toPlayerDirX = dx / Math.sqrt(distSq);
      const toPlayerDirZ = dz / Math.sqrt(distSq);

      const dot = carForwardX * toPlayerDirX + carForwardZ * toPlayerDirZ;

      // In firing cone (~28 degrees: cos(28°) ≈ 0.88)
      if (dot > 0.88) {
        // AI fires projectile!
        const projectile = this.pool.acquire();
        if (projectile) {
          const muzzlePos = aiCar.position.clone().add(
            new THREE.Vector3(carForwardX * 2.2, 0.55, carForwardZ * 2.2)
          );

          projectile.launch(aiCar, muzzlePos, aiCar.heading, {
            isAI: true,
            damage: this.config.projectileDamage * 0.75, // AI does slightly scaled damage
            speed: this.config.projectileSpeed * 0.95
          });

          this.effects.spawnMuzzleFlash(muzzlePos, 0xff2200);
          sound.playLaserShoot(true);

          // Reset AI cooldown based on personality
          const baseCooldown = aiCar.racerId === 'nitro' ? 1.6 : (aiCar.racerId === 'apex' ? 2.4 : 3.8);
          aiCar.weaponCooldown = baseCooldown + Math.random() * 0.6;
        }
      }
    }
  }

  /**
   * Main per-frame combat update loop
   * @param {number} dt Delta time in seconds
   * @param {THREE.Camera} camera Current perspective camera for billboarding
   * @param {boolean} isRaceActive Whether race is actively running
   */
  update(dt, camera, isRaceActive) {
    // 1. Update player weapon cooldown
    if (this.playerCar.weaponCooldown > 0) {
      this.playerCar.weaponCooldown = Math.max(0, this.playerCar.weaponCooldown - dt);
    }

    // 2. Update AI shooting
    if (isRaceActive) {
      for (const ai of this.aiCars) {
        this.updateAIFiring(ai, dt);
      }
    }

    // 3. Update active projectiles & resolve collisions
    const activeProjectiles = this.pool.getActive();

    for (const proj of activeProjectiles) {
      // Move projectile independently forward
      const isAlive = proj.update(dt);

      if (!isAlive) {
        this.pool.release(proj);
        continue;
      }

      // Check collision with cars
      let hitCar = false;
      for (const targetCar of this.allCars) {
        // Can't shoot yourself
        if (proj.owner === targetCar) continue;

        const dx = targetCar.position.x - proj.position.x;
        const dz = targetCar.position.z - proj.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < this.config.hitRadius * this.config.hitRadius) {
          hitCar = true;
          proj.hasHit = true;

          // Apply damage to vehicle
          const damageResult = targetCar.takeDamage(proj.damage, proj.owner) || {};
          const isBroken = Boolean(damageResult.isBroken || targetCar.isShieldBroken);

          // Spawn contact shockwave & spark explosion
          const hitColor = proj.isAI ? 0xff3300 : 0x00f0ff;
          this.effects.spawnImpact(proj.position, hitColor, isBroken);

          // Sound effects & notifications
          if (isBroken) {
            sound.playShieldBreak();
            if (this.onShieldBreakCallback) this.onShieldBreakCallback(targetCar, proj.owner);
            if (this.onHit) this.onHit({ target: targetCar, attacker: proj.owner, isShieldBreak: true });
          } else {
            sound.playImpact();
            if (this.onHitCallback) this.onHitCallback(targetCar, proj.owner, proj.damage);
            if (this.onHit) this.onHit({ target: targetCar, attacker: proj.owner, isShieldBreak: false });
          }

          // Return projectile to pool in O(1) time
          this.pool.release(proj);
          break;
        }
      }

      // If didn't hit a car, check collision with track barriers
      if (!hitCar && this.track) {
        const col = this.track.checkBarrierCollision(proj.position, 0.8);
        if (col.collided) {
          // Spark on barrier impact and return to pool
          this.effects.spawnImpact(proj.position, 0xffaa00, false);
          sound.playImpact();
          this.pool.release(proj);
        }
      }
    }

    // 4. Update visual effects (sparks, shockwaves, muzzle flashes)
    this.effects.update(dt);

    // 5. Update 3D Floating Shield Bars
    for (const car of this.allCars) {
      const shieldBar = this.shieldBars.get(car.racerId);
      if (shieldBar) {
        shieldBar.update(car.shield, car.maxShield, car.isShieldBroken, camera);
      }
    }
  }

  /**
   * Reset all combat states, reclaim projectiles, and restore shields
   */
  reset() {
    this.pool.reclaimAll();
    this.effects.clear();

    for (const car of this.allCars) {
      if (typeof car.resetCombat === 'function') {
        car.resetCombat();
      }
    }
  }

  destroy() {
    this.pool.reclaimAll();
    for (const sb of this.shieldBars.values()) {
      sb.destroy();
    }
    this.shieldBars.clear();
  }
}
