import * as THREE from 'three';
import { sound } from '../game/AudioSystem.js';

export const POWERUP_TYPES = {
  AMMO: 'ammo',
  SHIELD: 'shield',
  NITRO: 'nitro'
};

/**
 * Manages 3D rotating collectible powerups along the race track
 */
export class PowerUpManager {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../game/Track.js').Track} track
   */
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;

    this.powerups = [];
    this.initPickups();
  }

  initPickups() {
    // Strategic placement locations along track nodes
    const spawnPoints = [
      { nodeId: 'CP_1', type: POWERUP_TYPES.AMMO, offset: 0 },
      { nodeId: 'CP_3', type: POWERUP_TYPES.SHIELD, offset: 3 },
      { nodeId: 'CP_6A', type: POWERUP_TYPES.NITRO, offset: -2 },
      { nodeId: 'CP_6B', type: POWERUP_TYPES.AMMO, offset: 0 },
      { nodeId: 'CP_9', type: POWERUP_TYPES.AMMO, offset: 2 },
      { nodeId: 'CP_11', type: POWERUP_TYPES.SHIELD, offset: -3 },
      { nodeId: 'CP_13A', type: POWERUP_TYPES.NITRO, offset: 0 },
      { nodeId: 'CP_14B', type: POWERUP_TYPES.AMMO, offset: 0 },
      { nodeId: 'CP_16', type: POWERUP_TYPES.AMMO, offset: 2 }
    ];

    spawnPoints.forEach((sp, idx) => {
      const pos = this.track.nodePositions[sp.nodeId];
      if (!pos) return;

      const group = new THREE.Group();
      let colorHex = 0x00f0ff;
      let mesh = null;

      if (sp.type === POWERUP_TYPES.AMMO) {
        // Cyan Cyber Energy Crate
        colorHex = 0x00f0ff;
        const geo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x005577,
          metalness: 0.8,
          roughness: 0.2
        });
        mesh = new THREE.Mesh(geo, mat);
      } else if (sp.type === POWERUP_TYPES.SHIELD) {
        // Green Shield Crystal (Octahedron)
        colorHex = 0x00ff88;
        const geo = new THREE.OctahedronGeometry(0.85);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x00ff88,
          emissive: 0x006622,
          metalness: 0.9,
          roughness: 0.1
        });
        mesh = new THREE.Mesh(geo, mat);
      } else {
        // Orange Nitro Canister (Cylinder)
        colorHex = 0xff6600;
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 10);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xff6600,
          emissive: 0x662200,
          metalness: 0.85,
          roughness: 0.2
        });
        mesh = new THREE.Mesh(geo, mat);
      }

      group.add(mesh);

      // Under-glow point light
      const light = new THREE.PointLight(colorHex, 1.8, 8);
      light.position.set(0, 0, 0);
      group.add(light);

      // Position on the road slightly offset
      group.position.copy(pos);
      group.position.x += sp.offset;
      group.position.y = 1.0;

      this.scene.add(group);

      this.powerups.push({
        id: `pu_${idx}`,
        type: sp.type,
        colorHex,
        group,
        mesh,
        baseY: 1.0,
        position: group.position,
        radius: 2.2,
        active: true,
        respawnTimer: 0,
        respawnDelay: 10.0 // 10s cooldown
      });
    });
  }

  /**
   * Update rotation, floating bob, respawn timers, and car collection
   * @param {number} dt Delta time in seconds
   * @param {Array<any>} cars Array of all cars (player + AI)
   * @param {Function} [onCollectCallback]
   */
  update(dt, cars, onCollectCallback = null) {
    const time = Date.now() * 0.003;

    for (const pu of this.powerups) {
      if (!pu.active) {
        pu.respawnTimer -= dt;
        if (pu.respawnTimer <= 0) {
          pu.active = true;
          pu.group.visible = true;
        }
        continue;
      }

      // Continuous 3D rotation and floating hover animation
      pu.mesh.rotation.y += 2.0 * dt;
      pu.mesh.rotation.x = Math.sin(time) * 0.2;
      pu.group.position.y = pu.baseY + Math.sin(time * 2.5) * 0.25;

      // Check pickup collection with any car
      for (const car of cars) {
        const dx = car.position.x - pu.position.x;
        const dz = car.position.z - pu.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < pu.radius * pu.radius) {
          this.collect(pu, car, onCollectCallback);
          break;
        }
      }
    }
  }

  collect(pu, car, callback) {
    pu.active = false;
    pu.group.visible = false;
    pu.respawnTimer = pu.respawnDelay;

    // Apply benefit
    let message = '';
    if (pu.type === POWERUP_TYPES.AMMO) {
      const added = car.addAmmo ? car.addAmmo(10) : 10;
      message = `AMMO RESTORED +${added}!`;
    } else if (pu.type === POWERUP_TYPES.SHIELD) {
      const added = car.repairShield ? car.repairShield(30) : 30;
      message = `SHIELD REPAIRED +${added}!`;
    } else if (pu.type === POWERUP_TYPES.NITRO) {
      if (car.applyNitro) car.applyNitro(3.0);
      message = `NITRO BOOST ACTIVATED!`;
    }

    // Play procedural pickup chime
    sound.playPickupSound();

    if (callback) {
      callback(pu.type, car, message);
    }
  }

  reset() {
    for (const pu of this.powerups) {
      pu.active = true;
      pu.respawnTimer = 0;
      pu.group.visible = true;
    }
  }

  destroy() {
    for (const pu of this.powerups) {
      if (pu.group && this.scene) {
        this.scene.remove(pu.group);
      }
    }
    this.powerups = [];
  }
}
