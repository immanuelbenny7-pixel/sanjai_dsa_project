import * as THREE from 'three';
import { Checkpoint } from './Checkpoint.js';
import { Graph } from '../dsa/Graph.js';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.checkpoints = new Map();
    this.graph = new Graph();
    this.roadMeshes = [];
    this.colliders = []; // Barrier line segments for collision checks
    this.trackWidth = 18;

    this.textureLoader = new THREE.TextureLoader();
    this.roadTexture = null;

    this.init();
  }

  init() {
    this.loadTextures();
    this.defineNodes();
    this.buildGraph();
    this.buildRoads();
    this.buildBarriers();
    this.buildEnvironment();
    this.buildCheckpoints();
  }

  loadTextures() {
    this.roadTexture = this.textureLoader.load('/assets/Seamless-Road-Texture1.jpg');
    this.roadTexture.wrapS = THREE.RepeatWrapping;
    this.roadTexture.wrapT = THREE.RepeatWrapping;
  }

  defineNodes() {
    // 3D coordinates for all track vertices
    this.nodePositions = {
      // Main circuit trunk 1
      'CP_0': new THREE.Vector3(0, 0, -100),       // Start / Finish Line
      'CP_1': new THREE.Vector3(0, 0, -190),       // First straight
      'CP_2': new THREE.Vector3(50, 0, -260),      // Sweeping right turn entry
      'CP_3': new THREE.Vector3(150, 0, -270),     // North-east curve apex
      'CP_4': new THREE.Vector3(230, 0, -200),     // Junction 1 (Split: Outer Main vs Neon Shortcut)

      // Route A: Outer Main Route (Longer, sweeping turns)
      'CP_5A': new THREE.Vector3(320, 0, -170),
      'CP_6A': new THREE.Vector3(360, 0, -70),
      'CP_7A': new THREE.Vector3(330, 0, 30),

      // Route B: Neon Alley Shortcut (Shorter, tight chicane)
      'CP_5B': new THREE.Vector3(240, 0, -100),
      'CP_6B': new THREE.Vector3(210, 0, -30),

      // Convergence 1
      'CP_8': new THREE.Vector3(230, 0, 60),

      // Main circuit trunk 2
      'CP_9': new THREE.Vector3(170, 0, 140),
      'CP_10': new THREE.Vector3(70, 0, 200),
      'CP_11': new THREE.Vector3(-50, 0, 210),
      'CP_12': new THREE.Vector3(-150, 0, 160),    // Junction 2 (Split: Highway Sweep vs Hairpin Alley)

      // Route C: High-Speed Highway Sweep (Wide radius, higher speed capability)
      'CP_13A': new THREE.Vector3(-270, 0, 130),
      'CP_14A': new THREE.Vector3(-300, 0, -20),

      // Route D: Inner Hairpin (Tight inner turn, technical driving)
      'CP_13B': new THREE.Vector3(-200, 0, 70),
      'CP_14B': new THREE.Vector3(-170, 0, -10),

      // Convergence 2
      'CP_15': new THREE.Vector3(-220, 0, -90),

      // Final chicane to Finish
      'CP_16': new THREE.Vector3(-120, 0, -105)
    };

    // Node metadata
    this.nodeMeta = {
      'CP_0': { name: 'Start/Finish Gantry', isStartFinish: true, route: 'trunk' },
      'CP_1': { name: 'Dijkstra Straight', route: 'trunk' },
      'CP_2': { name: 'Turn 1 Apex', route: 'trunk' },
      'CP_3': { name: 'North Boulevard', route: 'trunk' },
      'CP_4': { name: 'Junction Alpha', isJunction: true, route: 'trunk' },
      'CP_5A': { name: 'Outer Ring 1', route: 'outer_loop' },
      'CP_6A': { name: 'Outer Ring 2', route: 'outer_loop' },
      'CP_7A': { name: 'Outer Ring 3', route: 'outer_loop' },
      'CP_5B': { name: 'Neon Shortcut 1', route: 'shortcut' },
      'CP_6B': { name: 'Neon Shortcut 2', route: 'shortcut' },
      'CP_8': { name: 'Junction Beta', isConvergence: true, route: 'trunk' },
      'CP_9': { name: 'Southern Curve 1', route: 'trunk' },
      'CP_10': { name: 'Min-Heap Sweeper', route: 'trunk' },
      'CP_11': { name: 'Grandstand Straight', route: 'trunk' },
      'CP_12': { name: 'Junction Gamma', isJunction: true, route: 'trunk' },
      'CP_13A': { name: 'Highway West 1', route: 'highway' },
      'CP_14A': { name: 'Highway West 2', route: 'highway' },
      'CP_13B': { name: 'Inner Hairpin 1', route: 'hairpin' },
      'CP_14B': { name: 'Inner Hairpin 2', route: 'hairpin' },
      'CP_15': { name: 'Junction Delta', isConvergence: true, route: 'trunk' },
      'CP_16': { name: 'Merge Sort Chicane', route: 'trunk' }
    };
  }

  buildGraph() {
    // 1. Add all vertices
    for (const [id, pos] of Object.entries(this.nodePositions)) {
      this.graph.addVertex(id, {
        position: pos.clone(),
        ...this.nodeMeta[id]
      });
    }

    // 2. Define track segment connections
    const edges = [
      // Trunk 1
      ['CP_0', 'CP_1'],
      ['CP_1', 'CP_2'],
      ['CP_2', 'CP_3'],
      ['CP_3', 'CP_4'],

      // Junction 1 splits:
      // Route A (Outer)
      ['CP_4', 'CP_5A'],
      ['CP_5A', 'CP_6A'],
      ['CP_6A', 'CP_7A'],
      ['CP_7A', 'CP_8'],

      // Route B (Neon Shortcut)
      ['CP_4', 'CP_5B'],
      ['CP_5B', 'CP_6B'],
      ['CP_6B', 'CP_8'],

      // Trunk 2
      ['CP_8', 'CP_9'],
      ['CP_9', 'CP_10'],
      ['CP_10', 'CP_11'],
      ['CP_11', 'CP_12'],

      // Junction 2 splits:
      // Route C (Highway)
      ['CP_12', 'CP_13A'],
      ['CP_13A', 'CP_14A'],
      ['CP_14A', 'CP_15'],

      // Route D (Hairpin)
      ['CP_12', 'CP_13B'],
      ['CP_13B', 'CP_14B'],
      ['CP_14B', 'CP_15'],

      // Final trunk to start
      ['CP_15', 'CP_16'],
      ['CP_16', 'CP_0']
    ];

    this.segmentEdges = edges;

    for (const [from, to] of edges) {
      const p1 = this.nodePositions[from];
      const p2 = this.nodePositions[to];
      const dist = p1.distanceTo(p2);
      this.graph.addEdge(from, to, dist, {
        length: dist,
        routeType: this.nodeMeta[to].route || 'trunk'
      });
    }
  }

  buildRoads() {
    const roadGroup = new THREE.Group();
    const halfW = this.trackWidth / 2;

    const roadMaterial = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.85,
      metalness: 0.15
    });

    const curbMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d9ff,
      emissive: 0x003344,
      roughness: 0.5
    });

    for (const [fromId, toId] of this.segmentEdges) {
      const p1 = this.nodePositions[fromId];
      const p2 = this.nodePositions[toId];

      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const length = p1.distanceTo(p2);
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      // Road quad geometry
      const geom = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        p1.x - perp.x * halfW, p1.y + 0.05, p1.z - perp.z * halfW,
        p1.x + perp.x * halfW, p1.y + 0.05, p1.z + perp.z * halfW,
        p2.x - perp.x * halfW, p2.y + 0.05, p2.z - perp.z * halfW,

        p2.x - perp.x * halfW, p2.y + 0.05, p2.z - perp.z * halfW,
        p1.x + perp.x * halfW, p1.y + 0.05, p1.z + perp.z * halfW,
        p2.x + perp.x * halfW, p2.y + 0.05, p2.z + perp.z * halfW,
      ]);

      const uRepeat = 2;
      const vRepeat = length / 8;
      const uvs = new Float32Array([
        0, 0,
        uRepeat, 0,
        0, vRepeat,

        0, vRepeat,
        uRepeat, 0,
        uRepeat, vRepeat,
      ]);

      geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geom.computeVertexNormals();

      const mesh = new THREE.Mesh(geom, roadMaterial);
      mesh.receiveShadow = true;
      roadGroup.add(mesh);
      this.roadMeshes.push(mesh);
    }

    this.scene.add(roadGroup);
  }

  addBarrierSegment(p1, p2, offsetSide, neonMat, group, barrierMat, trimStart = 2.0, trimEnd = 2.0) {
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    const totalLen = p1.distanceTo(p2);
    if (totalLen <= trimStart + trimEnd + 1.0) return;

    const actualP1 = p1.clone().addScaledVector(dir, trimStart);
    const actualP2 = p2.clone().addScaledVector(dir, -trimEnd);
    const length = actualP1.distanceTo(actualP2);

    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const mid = new THREE.Vector3().addVectors(actualP1, actualP2).multiplyScalar(0.5);
    const angle = Math.atan2(dir.x, dir.z);
    const halfW = this.trackWidth / 2 + 0.4;
    const sign = offsetSide === 'left' ? -1 : 1;

    // Visual barrier wall
    const boxGeo = new THREE.BoxGeometry(0.5, 1.2, length);
    const mesh = new THREE.Mesh(boxGeo, barrierMat);
    mesh.position.set(mid.x + perp.x * halfW * sign, 0.6, mid.z + perp.z * halfW * sign);
    mesh.rotation.y = angle;
    group.add(mesh);

    // Glowing neon strip along top edge
    const neonGeo = new THREE.BoxGeometry(0.15, 0.15, length);
    const neonMesh = new THREE.Mesh(neonGeo, neonMat);
    neonMesh.position.set(
      mid.x + perp.x * (halfW - 0.2) * sign,
      0.9,
      mid.z + perp.z * (halfW - 0.2) * sign
    );
    neonMesh.rotation.y = angle;
    group.add(neonMesh);

    // Physical collision segment matching the barrier exactly
    const startX = actualP1.x + perp.x * (halfW + 0.5) * sign;
    const startZ = actualP1.z + perp.z * (halfW + 0.5) * sign;
    const endX = actualP2.x + perp.x * (halfW + 0.5) * sign;
    const endZ = actualP2.z + perp.z * (halfW + 0.5) * sign;
    const normSign = offsetSide === 'left' ? 1 : -1;

    this.colliders.push({
      p1: new THREE.Vector2(startX, startZ),
      p2: new THREE.Vector2(endX, endZ),
      normal: new THREE.Vector2(perp.x * normSign, perp.z * normSign)
    });
  }

  buildBarriers() {
    const barrierGroup = new THREE.Group();
    this.colliders = []; // Clean collision list strictly mapped to legitimate barriers

    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a24,
      metalness: 0.9,
      roughness: 0.3
    });

    const neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    // 1. Continuous Outer Track Perimeter (Outer Right Edge)
    // Trimmed at split and merge junctions to keep roadways completely open
    const outerEdges = [
      ['CP_0', 'CP_1', 2, 2],
      ['CP_1', 'CP_2', 2, 2],
      ['CP_2', 'CP_3', 2, 2],
      ['CP_3', 'CP_4', 2, 2],
      ['CP_4', 'CP_5A', 18, 2], // Open fork at CP_4
      ['CP_5A', 'CP_6A', 2, 2],
      ['CP_6A', 'CP_7A', 2, 2],
      ['CP_7A', 'CP_8', 2, 18], // Open merge at CP_8
      ['CP_8', 'CP_9', 2, 2],
      ['CP_9', 'CP_10', 2, 2],
      ['CP_10', 'CP_11', 2, 2],
      ['CP_11', 'CP_12', 2, 2],
      ['CP_12', 'CP_13A', 18, 2], // Open fork at CP_12
      ['CP_13A', 'CP_14A', 2, 2],
      ['CP_14A', 'CP_15', 2, 32], // Wide open merge into CP_15
      ['CP_15', 'CP_16', 14, 2], // Clear convergence zone
      ['CP_16', 'CP_0', 2, 18]   // Clear turn into Start line
    ];

    for (const [from, to, ts, te] of outerEdges) {
      const p1 = this.nodePositions[from];
      const p2 = this.nodePositions[to];
      if (p1 && p2) {
        this.addBarrierSegment(p1, p2, 'right', neonOrangeMat, barrierGroup, barrierMat, ts, te);
      }
    }

    // 2. Continuous Inner Track Perimeter (Inner Left Edge)
    const innerEdges = [
      ['CP_0', 'CP_1', 8, 2],
      ['CP_1', 'CP_2', 2, 2],
      ['CP_2', 'CP_3', 2, 2],
      ['CP_3', 'CP_4', 2, 2],
      ['CP_5B', 'CP_6B', 6, 6],
      ['CP_8', 'CP_9', 2, 2],
      ['CP_9', 'CP_10', 2, 2],
      ['CP_10', 'CP_11', 2, 2],
      ['CP_11', 'CP_12', 2, 2],
      ['CP_13B', 'CP_14B', 6, 6],
      ['CP_15', 'CP_16', 14, 2],
      ['CP_16', 'CP_0', 2, 18]
    ];

    for (const [from, to, ts, te] of innerEdges) {
      const p1 = this.nodePositions[from];
      const p2 = this.nodePositions[to];
      if (p1 && p2) {
        this.addBarrierSegment(p1, p2, 'left', neonCyanMat, barrierGroup, barrierMat, ts, te);
      }
    }

    // 3. Island 1 Divider (Between Outer Route A and Neon Shortcut Route B)
    addCleanBarrierSegment: {
      const island1A = [['CP_5A', 'CP_6A', 4, 4], ['CP_6A', 'CP_7A', 4, 4]];
      for (const [fromId, toId, ts, te] of island1A) {
        this.addBarrierSegment(this.nodePositions[fromId], this.nodePositions[toId], 'left', neonCyanMat, barrierGroup, barrierMat, ts, te);
      }
    }

    // 4. Island 2 Divider (Between Highway West Route C and Inner Hairpin Route D)
    {
      const island2C = [['CP_13A', 'CP_14A', 4, 4]];
      for (const [fromId, toId, ts, te] of island2C) {
        this.addBarrierSegment(this.nodePositions[fromId], this.nodePositions[toId], 'left', neonCyanMat, barrierGroup, barrierMat, ts, te);
      }
    }

    this.scene.add(barrierGroup);
  }

  buildEnvironment() {
    const envGroup = new THREE.Group();

    // Dark ground grid
    const groundGeo = new THREE.PlaneGeometry(1200, 1200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x05050a,
      roughness: 0.9,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    envGroup.add(ground);

    // Grid helper overlay
    const grid = new THREE.GridHelper(1000, 50, 0x00f0ff, 0x112233);
    grid.position.y = 0.01;
    envGroup.add(grid);

    // Cyberpunk skyscrapers / neon buildings surrounding the track
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x0d0e15,
      roughness: 0.4,
      metalness: 0.8
    });

    const windowColors = [0x00f0ff, 0xff0055, 0xffaa00, 0x7700ff];

    // Seeded building cluster layout around outer bounds
    const buildingCoords = [
      // North skyline
      [-100, -380, 50, 120, 50], [0, -390, 60, 160, 60], [100, -370, 70, 140, 60],
      [220, -350, 55, 110, 55], [320, -320, 65, 150, 65],
      // East skyline
      [420, -220, 60, 130, 60], [450, -100, 75, 170, 70], [430, 20, 65, 145, 60],
      [360, 140, 55, 115, 55], [290, 220, 70, 135, 65],
      // South skyline
      [150, 280, 60, 160, 60], [20, 300, 75, 180, 75], [-100, 310, 65, 150, 65],
      [-220, 270, 60, 130, 60],
      // West skyline
      [-360, 180, 70, 155, 70], [-400, 40, 80, 190, 80], [-390, -80, 65, 140, 65],
      [-350, -200, 70, 160, 70], [-250, -280, 60, 125, 60],
      // City center plaza (inside the track loop)
      [0, 30, 45, 90, 45], [60, -40, 40, 80, 40], [-80, -20, 40, 85, 40]
    ];

    buildingCoords.forEach(([bx, bz, bw, bh, bd], idx) => {
      const bGeo = new THREE.BoxGeometry(bw, bh, bd);
      const bMesh = new THREE.Mesh(bGeo, buildingMat);
      bMesh.position.set(bx, bh / 2, bz);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      envGroup.add(bMesh);

      // Glowing rooftop neon antenna / sign
      const neonCol = windowColors[idx % windowColors.length];
      const antennaGeo = new THREE.CylinderGeometry(0.3, 0.3, 16, 6);
      const antennaMat = new THREE.MeshBasicMaterial({ color: neonCol });
      const antenna = new THREE.Mesh(antennaGeo, antennaMat);
      antenna.position.set(bx, bh + 8, bz);
      envGroup.add(antenna);

      // Glowing roof beacon point light (gentle)
      if (idx % 3 === 0) {
        const beacon = new THREE.PointLight(neonCol, 1.2, 80);
        beacon.position.set(bx, bh + 16, bz);
        envGroup.add(beacon);
      }
    });

    // Streetlamps along track key points (placed safely 4m outside the road boundary)
    const lampNodes = ['CP_1', 'CP_3', 'CP_5A', 'CP_5B', 'CP_8', 'CP_10', 'CP_13A', 'CP_13B', 'CP_16'];
    lampNodes.forEach(nodeId => {
      const pos = this.nodePositions[nodeId];
      if (!pos) return;

      const outgoing = this.graph.getNeighbors(nodeId);
      let dir = new THREE.Vector3(0, 0, -1);
      if (outgoing && outgoing.length > 0) {
        const nextPos = this.nodePositions[outgoing[0].to];
        if (nextPos) dir.subVectors(nextPos, pos).normalize();
      }
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      const lampPos = pos.clone().addScaledVector(perp, this.trackWidth / 2 + 4.0);

      const poleGeo = new THREE.CylinderGeometry(0.25, 0.25, 9, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(lampPos.x, 4.5, lampPos.z);
      envGroup.add(pole);

      const lampHeadGeo = new THREE.BoxGeometry(1.2, 0.3, 0.8);
      const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const lampHead = new THREE.Mesh(lampHeadGeo, lampHeadMat);
      lampHead.position.set(lampPos.x, 9, lampPos.z);
      envGroup.add(lampHead);

      const light = new THREE.PointLight(0x00f0ff, 2.0, 35);
      light.position.set(lampPos.x, 8.5, lampPos.z);
      envGroup.add(light);
    });

    this.scene.add(envGroup);
  }

  buildCheckpoints() {
    for (const [id, pos] of Object.entries(this.nodePositions)) {
      // Find direction to next checkpoint
      const outgoing = this.graph.getNeighbors(id);
      let forward = new THREE.Vector3(0, 0, 1);
      if (outgoing.length > 0) {
        const nextPos = this.nodePositions[outgoing[0].to];
        if (nextPos) {
          forward.subVectors(nextPos, pos).normalize();
        }
      }

      const cp = new Checkpoint(id, pos, forward, this.trackWidth, this.nodeMeta[id]);
      this.checkpoints.set(id, cp);
      this.scene.add(cp.mesh);
    }
  }

  getCheckpoint(id) {
    return this.checkpoints.get(id);
  }

  getAllCheckpoints() {
    return Array.from(this.checkpoints.values());
  }

  /**
   * Return start/finish position and forward rotation for starting grid
   */
  getStartingGridSlot(slotIndex = 0) {
    const cp0 = this.nodePositions['CP_0'];
    const cp1 = this.nodePositions['CP_1'];
    const dir = new THREE.Vector3().subVectors(cp1, cp0).normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    // Staggered grid spacing: rows spaced 9m apart, alternating left and right lanes
    const row = Math.floor(slotIndex / 2);
    const lane = (slotIndex % 2 === 0) ? -3.5 : 3.5;

    const slotPos = cp0.clone()
      .addScaledVector(dir, row * 9.5)
      .addScaledVector(perp, lane);
    slotPos.y = 0.3;

    const angle = Math.atan2(dir.x, dir.z);

    return {
      position: slotPos,
      rotationY: angle,
      direction: dir
    };
  }

  /**
   * Check collision against track barrier lines
   * @param {THREE.Vector3} carPos
   * @param {number} carRadius
   * @returns {{ collided: boolean, normal: THREE.Vector2, penetration: number }}
   */
  checkBarrierCollision(carPos, carRadius = 1.6) {
    const px = carPos.x;
    const pz = carPos.z;

    for (const col of this.colliders) {
      const x1 = col.p1.x;
      const z1 = col.p1.y;
      const x2 = col.p2.x;
      const z2 = col.p2.y;

      const dx = x2 - x1;
      const dz = z2 - z1;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) continue;

      let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const nearestX = x1 + t * dx;
      const nearestZ = z1 + t * dz;

      const distX = px - nearestX;
      const distZ = pz - nearestZ;
      const dist = Math.sqrt(distX * distX + distZ * distZ);

      if (dist < carRadius) {
        return {
          collided: true,
          normal: col.normal.clone(),
          penetration: carRadius - dist
        };
      }
    }

    return { collided: false, penetration: 0 };
  }
}
