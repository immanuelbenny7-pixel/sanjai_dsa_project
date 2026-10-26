import * as THREE from 'three';

export class CollisionSystem {
  constructor(radius = 1.6) {
    this.carRadius = radius;
  }

  /**
   * Resolve collisions between all active racers
   * @param {Array<import('../vehicles/PlayerCar.js').PlayerCar | import('../vehicles/AICar.js').AICar>} cars
   */
  resolveCarCollisions(cars) {
    const minDist = this.carRadius * 2;

    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const c1 = cars[i];
        const c2 = cars[j];

        const dx = c2.position.x - c1.position.x;
        const dz = c2.position.z - c1.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;

          // Normal vector from c1 to c2
          const nx = dx / dist;
          const nz = dz / dist;

          // Push apart equally
          const separation = overlap * 0.55;
          c1.position.x -= nx * separation;
          c1.position.z -= nz * separation;
          c2.position.x += nx * separation;
          c2.position.z += nz * separation;

          // Velocity impulse exchange
          const relSpeed = c1.speed - c2.speed;
          if (relSpeed > 0) {
            c1.speed -= relSpeed * 0.4;
            c2.speed += relSpeed * 0.4;
          }
        }
      }
    }
  }
}
