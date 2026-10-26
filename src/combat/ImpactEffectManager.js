import * as THREE from 'three';

/**
 * 3D Impact Sparks, Shockwaves, and Muzzle Flash Particle System
 * Uses preallocated mesh pools for zero runtime allocation during high-intensity combat.
 */
export class ImpactEffectManager {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    // Shockwave Rings Pool
    this.rings = [];
    this.maxRings = 15;
    this.ringIndex = 0;
    this.initShockwaves();

    // Sparks Particle System (Point cloud)
    this.maxSparks = 120;
    this.initSparks();

    // Muzzle Flash Lights Pool
    this.flashes = [];
    this.maxFlashes = 6;
    this.flashIndex = 0;
    this.initMuzzleFlashes();
  }

  initShockwaves() {
    const ringGeo = new THREE.RingGeometry(0.3, 0.7, 16);
    for (let i = 0; i < this.maxRings; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.rings.push({
        mesh,
        mat,
        scale: 1,
        maxScale: 4.5,
        opacity: 0,
        speed: 16.0,
        active: false
      });
    }
  }

  initSparks() {
    this.sparkPositions = new Float32Array(this.maxSparks * 3);
    this.sparkVelocities = [];
    this.sparkLifetimes = new Float32Array(this.maxSparks);

    for (let i = 0; i < this.maxSparks; i++) {
      this.sparkPositions[i * 3 + 0] = 0;
      this.sparkPositions[i * 3 + 1] = -100;
      this.sparkPositions[i * 3 + 2] = 0;
      this.sparkVelocities.push(new THREE.Vector3());
      this.sparkLifetimes[i] = 0;
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));

    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa00,
      size: 0.45,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    this.scene.add(this.sparkPoints);
    this.nextSparkIdx = 0;
  }

  initMuzzleFlashes() {
    const flashGeo = new THREE.SphereGeometry(0.5, 8, 8);
    for (let i = 0; i < this.maxFlashes; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0
      });
      const mesh = new THREE.Mesh(flashGeo, mat);
      const light = new THREE.PointLight(0x00f0ff, 3.0, 10);
      mesh.add(light);
      mesh.visible = false;
      this.scene.add(mesh);

      this.flashes.push({
        mesh,
        mat,
        light,
        timer: 0,
        active: false
      });
    }
  }

  /**
   * Spawn 3D expanding impact shockwave and sparks
   * @param {THREE.Vector3} contactPoint 
   * @param {number} [colorHex=0x00f0ff]
   * @param {boolean} [isBigBreak=false]
   */
  spawnImpact(contactPoint, colorHex = 0x00f0ff, isBigBreak = false) {
    // 1. Activate shockwave ring
    const ring = this.rings[this.ringIndex];
    this.ringIndex = (this.ringIndex + 1) % this.maxRings;

    ring.mesh.position.copy(contactPoint);
    ring.mesh.position.y += 0.2;
    ring.mesh.rotation.x = -Math.PI / 2;
    ring.scale = 0.5;
    ring.maxScale = isBigBreak ? 7.0 : 4.0;
    ring.speed = isBigBreak ? 22.0 : 16.0;
    ring.opacity = 0.95;
    ring.mat.color.setHex(colorHex);
    ring.mat.opacity = 0.95;
    ring.mesh.scale.set(0.5, 0.5, 0.5);
    ring.mesh.visible = true;
    ring.active = true;

    // 2. Emit spark particles
    const count = isBigBreak ? 30 : 14;
    for (let k = 0; k < count; k++) {
      const idx = this.nextSparkIdx;
      this.nextSparkIdx = (this.nextSparkIdx + 1) % this.maxSparks;

      this.sparkPositions[idx * 3 + 0] = contactPoint.x;
      this.sparkPositions[idx * 3 + 1] = contactPoint.y + 0.3;
      this.sparkPositions[idx * 3 + 2] = contactPoint.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * (isBigBreak ? 18 : 12);
      const upSpeed = 2 + Math.random() * 8;

      this.sparkVelocities[idx].set(
        Math.cos(angle) * speed,
        upSpeed,
        Math.sin(angle) * speed
      );
      this.sparkLifetimes[idx] = 0.4 + Math.random() * 0.3;
    }
  }

  /**
   * Trigger muzzle flash at car cannon/hood
   * @param {THREE.Vector3} muzzlePos 
   * @param {number} [colorHex=0x00f0ff]
   */
  spawnMuzzleFlash(muzzlePos, colorHex = 0x00f0ff) {
    const flash = this.flashes[this.flashIndex];
    this.flashIndex = (this.flashIndex + 1) % this.maxFlashes;

    flash.mesh.position.copy(muzzlePos);
    flash.mat.color.setHex(colorHex);
    flash.light.color.setHex(colorHex);
    flash.mat.opacity = 0.9;
    flash.timer = 0.08; // Flash duration
    flash.mesh.visible = true;
    flash.active = true;
  }

  update(dt) {
    // 1. Update Shockwave Rings
    for (const r of this.rings) {
      if (!r.active) continue;

      r.scale += r.speed * dt;
      r.opacity -= dt * 2.8;

      if (r.opacity <= 0 || r.scale >= r.maxScale) {
        r.active = false;
        r.mesh.visible = false;
      } else {
        r.mesh.scale.set(r.scale, r.scale, r.scale);
        r.mat.opacity = Math.max(0, r.opacity);
      }
    }

    // 2. Update Sparks
    const posAttr = this.sparkPoints.geometry.attributes.position;
    let anyActive = false;

    for (let i = 0; i < this.maxSparks; i++) {
      if (this.sparkLifetimes[i] > 0) {
        anyActive = true;
        this.sparkLifetimes[i] -= dt;

        // Apply gravity
        this.sparkVelocities[i].y -= 25.0 * dt;

        this.sparkPositions[i * 3 + 0] += this.sparkVelocities[i].x * dt;
        this.sparkPositions[i * 3 + 1] += this.sparkVelocities[i].y * dt;
        this.sparkPositions[i * 3 + 2] += this.sparkVelocities[i].z * dt;

        // Bounce on asphalt
        if (this.sparkPositions[i * 3 + 1] < 0.1) {
          this.sparkPositions[i * 3 + 1] = 0.1;
          this.sparkVelocities[i].y *= -0.5;
        }
      } else {
        this.sparkPositions[i * 3 + 1] = -100;
      }
    }

    if (anyActive) {
      posAttr.needsUpdate = true;
    }

    // 3. Update Muzzle Flashes
    for (const f of this.flashes) {
      if (!f.active) continue;
      f.timer -= dt;
      if (f.timer <= 0) {
        f.active = false;
        f.mesh.visible = false;
      }
    }
  }

  clear() {
    for (const r of this.rings) {
      r.active = false;
      r.mesh.visible = false;
    }
    for (const f of this.flashes) {
      f.active = false;
      f.mesh.visible = false;
    }
    for (let i = 0; i < this.maxSparks; i++) {
      this.sparkLifetimes[i] = 0;
      this.sparkPositions[i * 3 + 1] = -100;
    }
    this.sparkPoints.geometry.attributes.position.needsUpdate = true;
  }
}
