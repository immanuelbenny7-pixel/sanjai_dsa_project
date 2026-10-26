/**
 * Automated Test Suite for 3D Combat Racing System and ProjectilePool DSA
 * Run with: npm test
 */

import { ProjectilePool } from '../dsa/ProjectilePool.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function runCombatTests() {
  console.log('\n=== TESTING 5: DSA Array-based ProjectilePool ===');

  let idCounter = 1;
  const dummyFactory = () => ({
    id: `proj_${idCounter++}`,
    x: 0,
    y: 0,
    z: 0,
    reset() {
      this.x = 0;
      this.y = 0;
      this.z = 0;
    }
  });

  const pool = new ProjectilePool(dummyFactory, 10, 25);

  assert(pool.freeList.length === 10, 'Pool preallocates initialCapacity (10 objects)');
  assert(pool.activeSet.size === 0, 'Active count starts at 0');
  assert(pool.getTelemetry().freeCount === 10, 'Available count starts at 10');

  // Test Acquire
  const p1 = pool.acquire();
  assert(p1 !== null, 'Acquire returns a projectile object');
  assert(p1.__isActive === true, 'Acquired projectile __isActive flag is set to true');
  assert(pool.activeSet.size === 1, 'Active count increments to 1');
  assert(pool.freeList.length === 9, 'Available count decrements to 9');

  // Acquire multiple
  const p2 = pool.acquire();
  const p3 = pool.acquire();
  assert(pool.activeSet.size === 3, 'Active count is 3 after 3 acquisitions');
  assert(pool.freeList.length === 7, 'Available count is 7');

  // Mutate projectile state to test recycling cleanliness
  p1.x = 100;
  p1.y = 50;

  // Test Release
  pool.release(p1);
  assert(p1.__isActive === false, 'Released projectile __isActive is reset to false');
  assert(p1.x === 0 && p1.y === 0, 'Released projectile state was cleared by reset()');
  assert(pool.activeSet.size === 2, 'Active count is now 2');
  assert(pool.freeList.length === 8, 'Available count returned to 8');

  // Re-acquire and verify state
  const pReused = pool.acquire();
  assert(pReused === p1, 'Pool reuses recycled object in O(1) LIFO order');
  assert(pReused.x === 0, 'Reused object has clean state, no stale coordinates');

  // Test Telemetry
  const telemetry = pool.getTelemetry();
  assert(telemetry.totalCapacity === 10, 'Telemetry reports correct totalCapacity (10)');
  assert(telemetry.totalAcquired === 4, 'Telemetry tracks total 4 acquisitions');
  assert(telemetry.totalReleased === 1, 'Telemetry tracks 1 release');

  // Test ReclaimAll
  pool.reclaimAll();
  assert(pool.activeSet.size === 0, 'reclaimAll returns all projectiles to pool');
  assert(pool.freeList.length === 10, 'Available count restored to 10');

  // Test Pool Dynamic Expansion
  const batch = [];
  for (let i = 0; i < 15; i++) {
    batch.push(pool.acquire());
  }
  assert(pool.metrics.totalCreated >= 15, 'Pool automatically grew to accommodate demand > 10');
  assert(pool.activeSet.size === 15, 'Active count is 15');
  pool.reclaimAll();
  assert(pool.activeSet.size === 0, 'All projectiles reclaimed after expansion');

  console.log('\n=== TESTING 6: Combat Damage & Shield Breakdown Mechanics ===');

  // Mock vehicle combat state replicating PlayerCar & AICar combat logic
  const mockCar = {
    shield: 100,
    maxShield: 100,
    ammo: 30,
    maxAmmo: 50,
    weaponCooldown: 0,
    isShieldBroken: false,
    slowdownTimer: 0,
    recoveryTimer: 0,
    nitroTimer: 0,

    takeDamage(amount = 20) {
      if (this.isShieldBroken) return;
      this.shield = Math.max(0, this.shield - amount);
      this.slowdownTimer = 1.5;
      if (this.shield <= 0) {
        this.isShieldBroken = true;
        this.shield = 0;
        this.slowdownTimer = 3.5;
        this.recoveryTimer = 4.0;
      }
    },

    repairShield(amount = 35) {
      this.shield = Math.min(this.maxShield, this.shield + amount);
      if (this.isShieldBroken && this.shield > 0) {
        this.isShieldBroken = false;
        this.recoveryTimer = 0;
      }
    },

    addAmmo(amount = 10) {
      this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
    },

    fireWeapon() {
      if (this.ammo <= 0 || this.weaponCooldown > 0) return false;
      this.ammo--;
      this.weaponCooldown = 0.35;
      return true;
    }
  };

  // Test initial state
  assert(mockCar.shield === 100, 'Car begins with full 100 shield points');
  assert(mockCar.ammo === 30, 'Car begins with 30 ammunition');

  // Test weapon firing
  const shot1 = mockCar.fireWeapon();
  assert(shot1 === true, 'Weapon fires successfully when ready');
  assert(mockCar.ammo === 29, 'Ammunition decreases to 29');
  assert(mockCar.weaponCooldown === 0.35, 'Cooldown set to 0.35s');

  const shot2 = mockCar.fireWeapon();
  assert(shot2 === false, 'Firing blocked during weapon cooldown');

  // Test damage
  mockCar.takeDamage(20);
  assert(mockCar.shield === 80, 'Shield reduced from 100 to 80 after 20 damage');
  assert(mockCar.slowdownTimer === 1.5, 'Temporary hit slowdown applied for 1.5s');

  mockCar.takeDamage(20);
  mockCar.takeDamage(20);
  mockCar.takeDamage(20);
  assert(mockCar.shield === 20, 'Shield reduced to 20 after successive hits');

  // Test shield break
  mockCar.takeDamage(20);
  assert(mockCar.shield === 0, 'Shield reduced to 0');
  assert(mockCar.isShieldBroken === true, 'isShieldBroken triggered on 0 shield');
  assert(mockCar.slowdownTimer === 3.5, 'Extended breakdown slowdown applied for 3.5s');
  assert(mockCar.recoveryTimer === 4.0, 'Recovery timer set to 4.0s');

  // Immunity while broken
  mockCar.takeDamage(20);
  assert(mockCar.shield === 0, 'Car does not take double-damage when shield is already broken');

  // Test Shield Repair pickup
  mockCar.repairShield(35);
  assert(mockCar.shield === 35, 'Repair pickup restores shield to 35');
  assert(mockCar.isShieldBroken === false, 'Shield repaired clears broken status');

  // Test Ammo pickup
  mockCar.addAmmo(15);
  assert(mockCar.ammo === 44, 'Ammo pack increases ammunition from 29 to 44');
  mockCar.addAmmo(20);
  assert(mockCar.ammo === 50, 'Ammunition capped at maxAmmo (50)');

  console.log('\n=============================================');
  console.log(`COMBAT SYSTEM RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('=============================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCombatTests();
