/**
 * STREET RACER: ALGORITHM WARS
 * Dijkstra's Shortest Path Algorithm
 * 
 * Computes optimal racing route between track checkpoints.
 * Uses custom MinHeap priority queue.
 * Time Complexity: O((V + E) log V)
 * Space Complexity: O(V)
 */

import { MinHeap } from './MinHeap.js';

export class Dijkstra {
  /**
   * Find shortest path between startId and targetId on a Graph
   * @param {import('./Graph.js').Graph} graph
   * @param {string|number} startId
   * @param {string|number} targetId
   * @param {Object} [options]
   * @param {boolean} [options.recordSteps=false] If true, records fine-grained steps for DSA Lab
   * @returns {{
   *   found: boolean,
   *   path: string[],
   *   totalCost: number,
   *   distances: Map<string, number>,
   *   predecessors: Map<string, string|null>,
   *   visitedOrder: string[],
   *   steps: Array<any>
   * }}
   */
  static findShortestPath(graph, startId, targetId, options = {}) {
    const start = String(startId);
    const target = String(targetId);
    const recordSteps = Boolean(options.recordSteps);

    if (!graph.hasVertex(start)) {
      throw new Error(`Start vertex "${start}" does not exist in graph`);
    }
    if (!graph.hasVertex(target)) {
      throw new Error(`Target vertex "${target}" does not exist in graph`);
    }

    const distances = new Map();
    const predecessors = new Map();
    const visited = new Set();
    const visitedOrder = [];
    const steps = [];

    // MinHeap prioritizes objects with { id, distance }
    const minHeap = new MinHeap((a, b) => a.distance - b.distance);

    // 1. Initialize distances
    for (const vId of graph.getVertexIds()) {
      distances.set(vId, Infinity);
      predecessors.set(vId, null);
    }
    distances.set(start, 0);

    // 2. Insert start vertex into MinHeap
    minHeap.insert({ id: start, distance: 0 });

    if (recordSteps) {
      steps.push({
        type: 'init',
        current: start,
        description: `Initialized start checkpoint "${start}" with distance 0.`,
        heapSnapshot: minHeap.getSnapshot(),
        distancesSnapshot: new Map(distances)
      });
    }

    let found = false;

    // 3. Process priority queue
    while (!minHeap.isEmpty()) {
      const minEntry = minHeap.extractMin();
      const currentId = minEntry.id;
      const currentDist = minEntry.distance;

      // Ignore stale entry if a shorter path to currentId was already processed
      if (currentDist > distances.get(currentId)) {
        continue;
      }

      visited.add(currentId);
      visitedOrder.push(currentId);

      if (recordSteps) {
        steps.push({
          type: 'extract',
          current: currentId,
          distance: currentDist,
          description: `Extracted checkpoint "${currentId}" with minimum tentative distance ${currentDist.toFixed(1)}.`,
          heapSnapshot: minHeap.getSnapshot()
        });
      }

      // Check if destination is reached
      if (currentId === target) {
        found = true;
        break;
      }

      // 4. Examine neighbors and relax edges
      const neighbors = graph.getNeighbors(currentId);
      for (const edge of neighbors) {
        const neighborId = edge.to;
        if (visited.has(neighborId)) continue;

        const newDist = currentDist + edge.weight;

        if (newDist < distances.get(neighborId)) {
          const oldDist = distances.get(neighborId);
          distances.set(neighborId, newDist);
          predecessors.set(neighborId, currentId);

          // Insert relaxed neighbor into MinHeap
          minHeap.insert({ id: neighborId, distance: newDist });

          if (recordSteps) {
            steps.push({
              type: 'relax',
              from: currentId,
              to: neighborId,
              weight: edge.weight,
              oldDistance: oldDist,
              newDistance: newDist,
              description: `Relaxed edge (${currentId} -> ${neighborId}): distance improved from ${oldDist === Infinity ? '∞' : oldDist.toFixed(1)} to ${newDist.toFixed(1)}.`,
              heapSnapshot: minHeap.getSnapshot()
            });
          }
        }
      }
    }

    // 5. Reconstruct path if reachable
    const path = [];
    let totalCost = distances.get(target);

    if (distances.get(target) !== Infinity) {
      found = true;
      let curr = target;
      while (curr !== null) {
        path.unshift(curr);
        curr = predecessors.get(curr);
      }
    } else {
      totalCost = Infinity;
    }

    if (recordSteps) {
      steps.push({
        type: 'complete',
        found,
        path,
        totalCost,
        description: found
          ? `Path found! Total cost: ${totalCost.toFixed(1)} via [${path.join(' -> ')}]`
          : `No reachable path found between "${start}" and "${target}".`
      });
    }

    return {
      found,
      path,
      totalCost,
      distances,
      predecessors,
      visitedOrder,
      steps
    };
  }
}
