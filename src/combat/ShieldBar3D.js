import * as THREE from 'three';

/**
 * 3D Floating Health / Shield Bar
 * Follows vehicle in world space and bill-boards toward the active camera
 */
export class ShieldBar3D {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Object3D} targetMesh Car mesh to hover above
   * @param {Object} [options]
   */
  constructor(scene, targetMesh, options = {}) {
    this.scene = scene;
    this.targetMesh = targetMesh;
    this.heightOffset = options.heightOffset || 2.2;
    this.barWidth = options.width || 2.4;
    this.barHeight = options.height || 0.18;

    this.group = new THREE.Group();

    // 1. Dark Frame / Background
    const bgGeo = new THREE.BoxGeometry(this.barWidth + 0.12, this.barHeight + 0.08, 0.08);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x07090e, transparent: true, opacity: 0.85 });
    this.bgMesh = new THREE.Mesh(bgGeo, bgMat);
    this.group.add(this.bgMesh);

    // 2. Shield Fill Bar with left anchor for clean horizontal scaling
    const fillGeo = new THREE.BoxGeometry(1, this.barHeight, 0.1);
    // Shift geometry so origin is at the left edge
    fillGeo.translate(0.5, 0, 0);

    this.fillMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.fillMesh = new THREE.Mesh(fillGeo, this.fillMat);
    // Position at left edge of the background frame
    this.fillMesh.position.set(-this.barWidth / 2, 0, 0.01);
    this.fillMesh.scale.x = this.barWidth;
    this.group.add(this.fillMesh);

    // 3. Shield Break Warning Glow
    const warningGeo = new THREE.PlaneGeometry(this.barWidth + 0.3, this.barHeight + 0.2);
    this.warningMat = new THREE.MeshBasicMaterial({
      color: 0xff0044,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.warningMesh = new THREE.Mesh(warningGeo, this.warningMat);
    this.warningMesh.position.z = -0.02;
    this.group.add(this.warningMesh);

    this.scene.add(this.group);
    this.group.visible = false;
  }

  /**
   * Update shield bar transform and fill percentage
   * @param {number} shield Current shield points
   * @param {number} maxShield Maximum shield points
   * @param {boolean} isBroken Whether shield is currently depleted
   * @param {THREE.Camera} camera Active Three.js perspective camera
   */
  update(shield, maxShield, isBroken, camera) {
    if (!this.targetMesh) return;

    // Follow car position in world coordinates
    this.group.position.copy(this.targetMesh.position);
    this.group.position.y += this.heightOffset;

    // Billboard towards camera
    if (camera) {
      this.group.quaternion.copy(camera.quaternion);
    }

    const ratio = Math.max(0, Math.min(1.0, shield / (maxShield || 100)));
    this.fillMesh.scale.x = this.barWidth * ratio;

    // Color gradient based on health
    if (isBroken || ratio <= 0) {
      this.fillMat.color.setHex(0x330000);
      this.warningMat.opacity = Math.sin(Date.now() * 0.015) > 0 ? 0.8 : 0.2;
    } else {
      this.warningMat.opacity = 0;
      if (ratio > 0.6) {
        this.fillMat.color.setHex(0x00f0ff); // Cyan high shield
      } else if (ratio > 0.3) {
        this.fillMat.color.setHex(0xffaa00); // Orange medium shield
      } else {
        this.fillMat.color.setHex(0xff0044); // Critical red
      }
    }

    // Always show if shield is damaged or broken, hide if full and not active
    this.group.visible = true;
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  destroy() {
    if (this.group && this.scene) {
      this.scene.remove(this.group);
    }
  }
}
