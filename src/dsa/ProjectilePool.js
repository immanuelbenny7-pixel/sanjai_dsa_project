/**
 * STREET RACER: ALGORITHM WARS
 * Component: ProjectilePool (Object Pool Pattern)
 * 
 * DATA STRUCTURE SPECIFICATION:
 * - Implements the Object Pool creational pattern using a fixed-capacity preallocated array.
 * - Avoids runtime memory allocations (operator 'new') and deallocations during the 60fps render loop.
 * - In real-time 3D games, continuous creation and destruction of projectiles triggers
 *   frequent JavaScript V8 Garbage Collection (GC) pauses, causing frame stutter/jank.
 * 
 * TIME & SPACE COMPLEXITY:
 * - Acquire: O(1) amortized - Pops an inactive object from the free pool stack.
 * - Release: O(1) - Pushes the recycled object back onto the free pool stack.
 * - Pre-allocation Space: O(Capacity) fixed memory overhead.
 * - Reset: O(1) per projectile.
 */

export class ProjectilePool {
  /**
   * @param {Function} factoryFn Function that instantiates a new 3D projectile object
   * @param {number} [initialCapacity=40] Number of projectiles to pre-allocate
   * @param {number} [maxCapacity=80] Maximum pool size cap to prevent runaway memory
   */
  constructor(factoryFn, initialCapacity = 40, maxCapacity = 80) {
    if (typeof factoryFn !== 'function') {
      throw new Error('[ProjectilePool] Factory function required to instantiate pool objects.');
    }

    this.factoryFn = factoryFn;
    this.initialCapacity = initialCapacity;
    this.maxCapacity = maxCapacity;

    /** @type {Array<any>} Stack of inactive, ready-to-use projectile instances */
    this.freeList = [];

    /** @type {Set<any>} Set of currently flying/active projectile instances for fast O(1) membership */
    this.activeSet = new Set();

    // Metrics for DSA evaluation & telemetry
    this.metrics = {
      totalCreated: 0,
      totalAcquired: 0,
      totalReleased: 0,
      peakActive: 0
    };

    // Pre-allocate initial capacity
    this.preallocate(this.initialCapacity);
  }

  /**
   * Pre-allocates N objects into the free pool
   * @param {number} count 
   */
  preallocate(count) {
    for (let i = 0; i < count; i++) {
      if (this.metrics.totalCreated >= this.maxCapacity) break;
      const obj = this.factoryFn(this.metrics.totalCreated);
      obj.__poolId = this.metrics.totalCreated++;
      obj.__isActive = false;
      this.freeList.push(obj);
    }
  }

  /**
   * Acquire an available projectile from the pool in O(1) time.
   * If the free list is empty and max capacity allows, expands pool dynamically.
   * @returns {any | null} Active projectile or null if pool is completely exhausted
   */
  acquire() {
    let obj = null;

    if (this.freeList.length > 0) {
      obj = this.freeList.pop();
    } else if (this.metrics.totalCreated < this.maxCapacity) {
      // Dynamic expansion if within safety ceiling
      obj = this.factoryFn(this.metrics.totalCreated);
      obj.__poolId = this.metrics.totalCreated++;
      console.log(`[ProjectilePool] Pool expanded dynamically: size=${this.metrics.totalCreated}`);
    } else {
      console.warn('[ProjectilePool] Pool exhausted! All projectiles currently active.');
      return null;
    }

    obj.__isActive = true;
    this.activeSet.add(obj);

    this.metrics.totalAcquired++;
    if (this.activeSet.size > this.metrics.peakActive) {
      this.metrics.peakActive = this.activeSet.size;
    }

    return obj;
  }

  /**
   * Releases an active projectile back to the free pool in O(1) time.
   * Automatically resets its lifecycle state to prevent stale data contamination.
   * @param {any} obj 
   */
  release(obj) {
    if (!obj || !obj.__isActive) return;

    // Reset projectile lifecycle
    if (typeof obj.reset === 'function') {
      obj.reset();
    }

    obj.__isActive = false;
    this.activeSet.delete(obj);
    this.freeList.push(obj);
    this.metrics.totalReleased++;
  }

  /**
   * Returns an array of all currently active projectiles for frame updates
   * @returns {Array<any>}
   */
  getActive() {
    return Array.from(this.activeSet);
  }

  /**
   * Returns pool status for HUD / DSA telemetry
   */
  getTelemetry() {
    return {
      activeCount: this.activeSet.size,
      freeCount: this.freeList.length,
      totalCapacity: this.metrics.totalCreated,
      totalAcquired: this.metrics.totalAcquired,
      totalReleased: this.metrics.totalReleased,
      peakActive: this.metrics.peakActive
    };
  }

  /**
   * Reclaims all active projectiles immediately (e.g. on race restart or menu exit)
   */
  reclaimAll() {
    for (const obj of this.activeSet) {
      if (typeof obj.reset === 'function') {
        obj.reset();
      }
      obj.__isActive = false;
      this.freeList.push(obj);
    }
    this.activeSet.clear();
  }
}
