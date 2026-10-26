import * as THREE from 'three';

globalThis.document = {
  createElementNS: () => ({
    set src(v) { },
    addEventListener: (type, fn) => { if (type === 'load') setTimeout(fn, 0); },
    removeEventListener: () => { }
  })
};

import { Track } from '../src/game/Track.js';

const scene = new THREE.Scene();
const track = new Track(scene);
track.colliders = [];
const halfW = track.trackWidth / 2 + 0.4;

function addCleanBarrier(p1, p2, side, trimStart = 2.0, trimEnd = 2.0, label = '') {
  const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
  const totalLen = p1.distanceTo(p2);
  if (totalLen <= trimStart + trimEnd + 1.0) return;

  const actualP1 = p1.clone().addScaledVector(dir, trimStart);
  const actualP2 = p2.clone().addScaledVector(dir, -trimEnd);
  const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const sign = side === 'left' ? -1 : 1;

  const startX = actualP1.x + perp.x * halfW * sign;
  const startZ = actualP1.z + perp.z * halfW * sign;
  const endX = actualP2.x + perp.x * halfW * sign;
  const endZ = actualP2.z + perp.z * halfW * sign;
  const normSign = side === 'left' ? 1 : -1;

  track.colliders.push({
    p1: new THREE.Vector2(startX, startZ),
    p2: new THREE.Vector2(endX, endZ),
    normal: new THREE.Vector2(perp.x * normSign, perp.z * normSign),
    label: `${label} (${side})`
  });
}

// 1. Outer Perimeter (Right side)
const outerEdges = [
  ['CP_0', 'CP_1', 2, 2],
  ['CP_1', 'CP_2', 2, 2],
  ['CP_2', 'CP_3', 2, 2],
  ['CP_3', 'CP_4', 2, 2],
  ['CP_4', 'CP_5A', 18, 2],
  ['CP_5A', 'CP_6A', 2, 2],
  ['CP_6A', 'CP_7A', 2, 2],
  ['CP_7A', 'CP_8', 2, 18],
  ['CP_8', 'CP_9', 2, 2],
  ['CP_9', 'CP_10', 2, 2],
  ['CP_10', 'CP_11', 2, 2],
  ['CP_11', 'CP_12', 2, 2],
  ['CP_12', 'CP_13A', 18, 2],
  ['CP_13A', 'CP_14A', 2, 2],
  ['CP_14A', 'CP_15', 2, 32], // Wide merge into CP_15
  ['CP_15', 'CP_16', 14, 2], // Clear convergence zone
  ['CP_16', 'CP_0', 2, 18]
];

for (const [from, to, ts, te] of outerEdges) {
  addCleanBarrier(track.nodePositions[from], track.nodePositions[to], 'right', ts, te, `${from}->${to}`);
}

// 2. Inner Perimeter (Left side)
const innerEdges = [
  ['CP_0', 'CP_1', 2, 2],
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
  addCleanBarrier(track.nodePositions[from], track.nodePositions[to], 'left', ts, te, `${from}->${to}`);
}

// 3. Island dividers (Between paths)
addCleanBarrier(track.nodePositions['CP_5A'], track.nodePositions['CP_6A'], 'left', 4, 4, '5A->6A');
addCleanBarrier(track.nodePositions['CP_6A'], track.nodePositions['CP_7A'], 'left', 4, 4, '6A->7A');
addCleanBarrier(track.nodePositions['CP_13A'], track.nodePositions['CP_14A'], 'left', 4, 4, '13A->14A');

const testSegments = [
  ['CP_0', 'CP_1'], ['CP_1', 'CP_2'], ['CP_2', 'CP_3'], ['CP_3', 'CP_4'],
  ['CP_4', 'CP_5A'], ['CP_5A', 'CP_6A'], ['CP_6A', 'CP_7A'], ['CP_7A', 'CP_8'],
  ['CP_4', 'CP_5B'], ['CP_5B', 'CP_6B'], ['CP_6B', 'CP_8'],
  ['CP_8', 'CP_9'], ['CP_9', 'CP_10'], ['CP_10', 'CP_11'], ['CP_11', 'CP_12'],
  ['CP_12', 'CP_13A'], ['CP_13A', 'CP_14A'], ['CP_14A', 'CP_15'],
  ['CP_12', 'CP_13B'], ['CP_13B', 'CP_14B'], ['CP_14B', 'CP_15'],
  ['CP_15', 'CP_16'], ['CP_16', 'CP_0']
];

let totalCollisions = 0;
for (const [from, to] of testSegments) {
  const p1 = track.nodePositions[from];
  const p2 = track.nodePositions[to];
  for (let i = 0; i <= 50; i++) {
    const frac = i / 50;
    const testPos = p1.clone().lerp(p2, frac);
    const col = track.checkBarrierCollision(testPos, 2.5);
    if (col.collided) {
      console.error(`COLLISION on ${from}->${to} frac=${frac.toFixed(2)}: col=${col.label || 'unknown'} pen=${col.penetration.toFixed(2)}`);
      totalCollisions++;
    }
  }
}

console.log(`\nScan finished across ${testSegments.length * 51} points.`);
console.log(`Total collisions along track lanes: ${totalCollisions}`);
if (totalCollisions === 0) {
  console.log('PERFECT: ZERO COLLISIONS! 100% CLEAN RACING SURFACE!');
}
