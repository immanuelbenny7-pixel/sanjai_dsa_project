import * as THREE from 'three';

/**
 * Checkpoint 3D Trigger & Visual Gate
 */
export class Checkpoint {
  /**
   * @param {string} id Unique checkpoint identifier (e.g. 'CP_0')
   * @param {THREE.Vector3} position 3D coordinates
   * @param {THREE.Vector3} forward Normalized forward direction vector
   * @param {number} width Track width at checkpoint
   * @param {Object} [meta] Additional metadata (isStartFinish, routeType, name)
   */
  constructor(id, position, forward, width = 18, meta = {}) {
    this.id = id;
    this.position = position.clone();
    this.forward = forward.clone().normalize();
    this.width = width;
    this.radius = width * 0.75;
    this.meta = { ...meta };
    this.isStartFinish = Boolean(meta.isStartFinish);

    this.mesh = this.createVisualGate();
  }

  createVisualGate() {
    const group = new THREE.Group();
    group.position.copy(this.position);

    // Compute rotation towards forward direction
    const angle = Math.atan2(this.forward.x, this.forward.z);
    group.rotation.y = angle;

    if (this.isStartFinish) {
      // Grand Overhead Cyber Gantry at Start / Finish Line
      const height = 8.0;
      const gantryWidth = this.width + 6.0; // Pillars placed 3m safely OFF the road
      const halfW = gantryWidth / 2;

      const gantryMat = new THREE.MeshStandardMaterial({
        color: 0x111118,
        metalness: 0.9,
        roughness: 0.2
      });

      const neonGlowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc
      });

      // Left & Right Pillars (safely off-track)
      const pillarGeo = new THREE.BoxGeometry(0.8, height, 0.8);
      const leftPillar = new THREE.Mesh(pillarGeo, gantryMat);
      leftPillar.position.set(-halfW, height / 2, 0);
      group.add(leftPillar);

      const rightPillar = new THREE.Mesh(pillarGeo, gantryMat);
      rightPillar.position.set(halfW, height / 2, 0);
      group.add(rightPillar);

      // Overhead Cross Beam (8m clearance, well above car height)
      const beamGeo = new THREE.BoxGeometry(gantryWidth + 1.0, 0.8, 1.0);
      const topBeam = new THREE.Mesh(beamGeo, gantryMat);
      topBeam.position.set(0, height, 0);
      group.add(topBeam);

      // Overhead glowing neon light bar
      const neonGeo = new THREE.BoxGeometry(gantryWidth, 0.2, 1.1);
      const neonStripe = new THREE.Mesh(neonGeo, neonGlowMat);
      neonStripe.position.set(0, height - 0.3, 0);
      group.add(neonStripe);

      // Road-level checkered / start finish line (flat on the asphalt at y = 0.06)
      const roadStripGeo = new THREE.PlaneGeometry(this.width, 1.4);
      const roadStripMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        side: THREE.DoubleSide
      });
      const roadStrip = new THREE.Mesh(roadStripGeo, roadStripMat);
      roadStrip.rotation.x = -Math.PI / 2;
      roadStrip.position.set(0, 0.06, 0);
      group.add(roadStrip);

      return group;
    }

    // Regular Sector Checkpoints:
    // Completely clear, wide-open road ahead!
    // Non-intrusive neon timing line embedded flush into the asphalt (zero physical height)
    const stripGeo = new THREE.PlaneGeometry(this.width, 0.6);
    const stripMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.06, 0);
    group.add(strip);

    // Two small curb-side timing beacons located 2.5m OFF the track on each side
    const pylonGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.4, 8);
    const pylonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const pylonDist = this.width / 2 + 2.5;

    const leftPylon = new THREE.Mesh(pylonGeo, pylonMat);
    leftPylon.position.set(-pylonDist, 0.7, 0);
    group.add(leftPylon);

    const rightPylon = new THREE.Mesh(pylonGeo, pylonMat);
    rightPylon.position.set(pylonDist, 0.7, 0);
    group.add(rightPylon);

    return group;
  }

  /**
   * Check if a car position triggers this checkpoint
   * @param {THREE.Vector3} carPos
   * @param {THREE.Vector3} carForward
   * @returns {boolean}
   */
  isTriggered(carPos, carForward = null) {
    const distSq = (carPos.x - this.position.x) ** 2 + (carPos.z - this.position.z) ** 2;
    if (distSq > this.radius * this.radius) return false;

    // Check height tolerance
    if (Math.abs(carPos.y - this.position.y) > 8) return false;

    // Directional check: car should be moving generally forward through the gate
    if (carForward) {
      const dot = carForward.dot(this.forward);
      if (dot < -0.3) {
        // Going backward through checkpoint
        return false;
      }
    }

    return true;
  }
}
