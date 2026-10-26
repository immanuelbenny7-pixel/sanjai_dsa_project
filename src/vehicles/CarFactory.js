import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const CAR_CONFIGS = {
  'factory_gt': {
    id: 'factory_gt',
    name: 'Factory GT',
    color: 0x00f0ff,
    accentColor: 0xffaa00,
    maxSpeed: 62,      // ~223 km/h
    acceleration: 28,
    handling: 2.8,
    braking: 36,
    weight: 1250,
    description: 'Balanced cyber street machine with optimal handling and speed.'
  },
  'apex_phantom': {
    id: 'apex_phantom',
    name: 'Apex Phantom',
    color: 0x00ff88,
    accentColor: 0x112211,
    maxSpeed: 58,
    acceleration: 26,
    handling: 3.4,
    braking: 42,
    weight: 1180,
    description: 'Precision apex predator tuned for razor-sharp corners and shortcuts.'
  },
  'nitro_blaze': {
    id: 'nitro_blaze',
    name: 'Nitro Blaze',
    color: 0xff2200,
    accentColor: 0xffaa00,
    maxSpeed: 68,      // ~245 km/h
    acceleration: 34,
    handling: 2.3,
    braking: 30,
    weight: 1320,
    description: 'Raw twin-turbo muscle with blistering straight-line acceleration.'
  },
  'shadow_stealth': {
    id: 'shadow_stealth',
    name: 'Shadow Stealth',
    color: 0x8800ff,
    accentColor: 0x15002a,
    maxSpeed: 60,
    acceleration: 27,
    handling: 3.0,
    braking: 38,
    weight: 1280,
    description: 'High-downforce prototype with rock-solid stability and drift recovery.'
  }
};

export class CarFactory {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.cachedGltf = null;
    this.loadPromise = this.preloadModel();
  }

  async preloadModel() {
    try {
      const modelUrl = encodeURI('/assets/models/Factory GT/Factory GT.glb');
      const gltf = await this.gltfLoader.loadAsync(modelUrl);
      this.cachedGltf = gltf;
      console.log('Successfully preloaded Factory GT 3D model');
    } catch (err) {
      console.warn('GLTF load failed (falling back to procedural sports car):', err);
    }
  }

  /**
   * Create a 3D Car Model for the given config ID
   * @param {string} carId
   * @returns {{ group: THREE.Group, wheels: THREE.Mesh[], headlights: THREE.Light[], taillights: THREE.Mesh[], setBrakeLight: Function }}
   */
  createCarModel(carId = 'factory_gt') {
    const config = CAR_CONFIGS[carId] || CAR_CONFIGS['factory_gt'];
    return this.buildProceduralSportsCar(config);
  }

  buildProceduralSportsCar(config) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: 0.85,
      roughness: 0.25
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      metalness: 0.5,
      roughness: 0.6
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x111a24,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.95,
      roughness: 0.1
    });

    // 1. Lower Chassis / Diffuser
    const chassisGeo = new THREE.BoxGeometry(2.0, 0.35, 4.4);
    const chassis = new THREE.Mesh(chassisGeo, carbonMat);
    chassis.position.y = 0.35;
    group.add(chassis);

    // 2. Main Aerodynamic Body
    const bodyGeo = new THREE.BoxGeometry(1.95, 0.45, 3.8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.65, -0.1);
    group.add(body);

    // Front nose taper / hood
    const hoodGeo = new THREE.BoxGeometry(1.85, 0.25, 1.3);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 0.6, 1.6);
    hood.rotation.x = 0.12;
    group.add(hood);

    // Front splitter
    const splitterGeo = new THREE.BoxGeometry(2.05, 0.1, 0.6);
    const splitter = new THREE.Mesh(splitterGeo, carbonMat);
    splitter.position.set(0, 0.25, 2.2);
    group.add(splitter);

    // 3. Cabin / Cockpit Roof
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.45, 1.8);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.05, -0.2);
    group.add(cabin);

    // Roof scoop
    const scoopGeo = new THREE.BoxGeometry(0.35, 0.12, 0.6);
    const scoop = new THREE.Mesh(scoopGeo, carbonMat);
    scoop.position.set(0, 1.32, -0.1);
    group.add(scoop);

    // 4. Rear Spoiler Wing
    const wingGeo = new THREE.BoxGeometry(2.1, 0.08, 0.45);
    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(0, 1.25, -2.0);

    const postGeo = new THREE.BoxGeometry(0.08, 0.4, 0.2);
    const leftPost = new THREE.Mesh(postGeo, carbonMat);
    leftPost.position.set(-0.6, 1.05, -1.95);
    const rightPost = new THREE.Mesh(postGeo, carbonMat);
    rightPost.position.set(0.6, 1.05, -1.95);

    group.add(wing);
    group.add(leftPost);
    group.add(rightPost);

    // 5. Dual Headlights
    const headMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const headGeo = new THREE.BoxGeometry(0.4, 0.12, 0.15);

    const leftHead = new THREE.Mesh(headGeo, headMat);
    leftHead.position.set(-0.72, 0.62, 2.15);
    const rightHead = new THREE.Mesh(headGeo, headMat);
    rightHead.position.set(0.72, 0.62, 2.15);
    group.add(leftHead);
    group.add(rightHead);

    // Headlight spotlights
    const leftSpot = new THREE.SpotLight(0x00f0ff, 1.5, 30, Math.PI / 6, 0.4);
    leftSpot.position.set(-0.72, 0.62, 2.2);
    leftSpot.target.position.set(-0.72, 0, 12);
    group.add(leftSpot);
    group.add(leftSpot.target);

    // 6. Dual Taillights
    const tailOffMat = new THREE.MeshStandardMaterial({
      color: 0x440000,
      emissive: 0x330000
    });
    const tailOnMat = new THREE.MeshBasicMaterial({
      color: 0xff0022
    });

    const tailGeo = new THREE.BoxGeometry(0.5, 0.12, 0.15);
    const leftTail = new THREE.Mesh(tailGeo, tailOffMat);
    leftTail.position.set(-0.65, 0.68, -2.02);
    const rightTail = new THREE.Mesh(tailGeo, tailOffMat);
    rightTail.position.set(0.65, 0.68, -2.02);
    group.add(leftTail);
    group.add(rightTail);

    // 7. Quad Exhausts
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.25, 12);
    [-0.35, -0.18, 0.18, 0.35].forEach(x => {
      const ex = new THREE.Mesh(exhaustGeo, chromeMat);
      ex.rotation.x = Math.PI / 2;
      ex.position.set(x, 0.32, -2.15);
      group.add(ex);
    });

    // 8. 4 Wheels (Tires + Rims + Brake Calipers)
    const wheels = [];
    const wheelPositions = [
      { name: 'frontLeft', x: -1.02, y: 0.38, z: 1.35, isFront: true },
      { name: 'frontRight', x: 1.02, y: 0.38, z: 1.35, isFront: true },
      { name: 'rearLeft', x: -1.02, y: 0.38, z: -1.35, isFront: false },
      { name: 'rearRight', x: 1.02, y: 0.38, z: -1.35, isFront: false },
    ];

    const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 18);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.9 });
    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.33, 10);
    const rimMat = new THREE.MeshStandardMaterial({ color: config.accentColor || 0xdddddd, metalness: 0.9, roughness: 0.2 });

    const wheelNodes = {};

    wheelPositions.forEach(wp => {
      const steerPivot = new THREE.Group();
      steerPivot.position.set(wp.x, wp.y, wp.z);

      const rollGroup = new THREE.Group();

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      rollGroup.add(tire);

      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      rollGroup.add(rim);

      steerPivot.add(rollGroup);
      group.add(steerPivot);

      wheels.push({
        pivot: steerPivot,
        roller: rollGroup,
        isFront: wp.isFront
      });

      wheelNodes[wp.name] = { pivot: steerPivot, roller: rollGroup };
    });

    // Underglow neon
    const underglow = new THREE.PointLight(config.color, 1.8, 6);
    underglow.position.set(0, 0.15, 0);
    group.add(underglow);

    const setBrakeLight = (isBraking) => {
      const activeMat = isBraking ? tailOnMat : tailOffMat;
      leftTail.material = activeMat;
      rightTail.material = activeMat;
    };

    return {
      group,
      config,
      bodyMat,
      wheels,
      wheelNodes,
      headlights: [leftSpot],
      taillights: [leftTail, rightTail],
      underglow,
      setBrakeLight
    };
  }
}

export const carFactory = new CarFactory();
