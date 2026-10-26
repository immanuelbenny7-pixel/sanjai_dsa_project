import * as THREE from 'three';

/**
 * Real-time 3D Energy Projectile
 * Represents a fast-moving laser/plasma bolt in the Three.js world
 */
export class Projectile {
  /**
   * @param {THREE.Scene} scene
   * @param {number} poolId
   */
  constructor(scene, poolId = 0) {
    this.scene = scene;
    this.poolId = poolId;

    // State
    this.owner = null;
    this.isAI = false;
    this.damage = 20;
    this.hitRadius = 1.4;
    this.speed = 125.0; // 125 m/s forward travel velocity
    this.lifetime = 3.0; // 3 seconds timeout
    this.age = 0;
    this.hasHit = false;

    // Movement vectors
    this.position = new THREE.Vector3(0, -100, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.heading = 0;

    // 3D Visual Mesh Group
    this.mesh = this.createMesh();
    this.scene.add(this.mesh);
    this.mesh.visible = false;
  }

  createMesh() {
    const group = new THREE.Group();

    // 1. Plasma Core (high-intensity luminous cylinder/capsule)
    const coreGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.8, 8);
    this.coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.95
    });
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    // Align length with Z-axis (forward/backward)
    this.coreMesh.rotation.x = Math.PI / 2;
    group.add(this.coreMesh);

    // 2. Outer Plasma Aura / Halo (elongated capsule)
    const auraGeo = new THREE.CylinderGeometry(0.32, 0.38, 2.2, 8);
    this.auraMat = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.auraMesh = new THREE.Mesh(auraGeo, this.auraMat);
    this.auraMesh.rotation.x = Math.PI / 2;
    group.add(this.auraMesh);

    // 3. Tip Glow Sphere (lead energy concentration)
    const tipGeo = new THREE.SphereGeometry(0.24, 8, 8);
    this.tipMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });
    this.tipMesh = new THREE.Mesh(tipGeo, this.tipMat);
    this.tipMesh.position.z = 0.9;
    group.add(this.tipMesh);

    // 4. Dynamic Point Light illuminating the track as it passes
    this.light = new THREE.PointLight(0x00f0ff, 1.8, 12);
    this.light.position.set(0, 0, 0);
    group.add(this.light);

    return group;
  }

  /**
   * Launch this projectile from weapon muzzle
   * @param {any} owner Car that fired this projectile
   * @param {THREE.Vector3} muzzlePos 3D launch origin
   * @param {number} heading Car yaw angle
   * @param {Object} [options]
   */
  launch(owner, muzzlePos, heading, options = {}) {
    this.owner = owner;
    this.isAI = Boolean(options.isAI);
    this.damage = options.damage || 20;
    this.speed = options.speed || 125.0;
    this.lifetime = options.lifetime || 3.0;
    this.age = 0;
    this.hasHit = false;

    // Set 3D transform
    this.position.copy(muzzlePos);
    this.position.y = Math.max(0.65, muzzlePos.y); // Safe flight altitude above asphalt
    this.heading = heading;

    // Direction vector from heading
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    // Projectile inherits a percentage of owner speed + its high muzzle velocity
    const ownerSpeed = owner && owner.speed ? Math.max(0, owner.speed) : 0;
    const totalSpeed = this.speed + ownerSpeed * 0.4;
    this.velocity.set(forwardX * totalSpeed, 0, forwardZ * totalSpeed);

    // Color theme: Cyan / Electric Blue for Player, Hot Red / Orange for AI
    const primaryColor = this.isAI ? 0xff2200 : 0x00f0ff;
    const auraColor = this.isAI ? 0xff6600 : 0x0088ff;

    this.coreMat.color.setHex(primaryColor);
    this.auraMat.color.setHex(auraColor);
    this.light.color.setHex(primaryColor);

    // Update 3D transforms
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;
    this.mesh.visible = true;
  }

  /**
   * Update position every frame
   * @param {number} dt Delta time in seconds
   * @returns {boolean} True if still active, false if expired
   */
  update(dt) {
    if (!this.mesh.visible) return false;

    this.age += dt;
    if (this.age >= this.lifetime) {
      return false; // Time out
    }

    // Integrate independent 3D motion
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Update Three.js transforms
    this.mesh.position.copy(this.position);

    // Subtle pulsing energy effect
    const pulse = 1.0 + Math.sin(this.age * 25) * 0.15;
    this.auraMesh.scale.set(pulse, pulse, 1.0);

    return true;
  }

  /**
   * Reset lifecycle state when returning to pool
   */
  reset() {
    this.owner = null;
    this.isAI = false;
    this.age = 0;
    this.hasHit = false;
    this.velocity.set(0, 0, 0);
    this.position.set(0, -100, 0);

    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.mesh.visible = false;
    }
  }

  destroy() {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
    if (this.coreMat) this.coreMat.dispose();
    if (this.auraMat) this.auraMat.dispose();
    if (this.tipMat) this.tipMat.dispose();
  }
}
