/**
 * Automated Test Suite for STREET RACER DSA Modules
 * Run with: npm test
 */

import { MinHeap } from '../dsa/MinHeap.js';
import { Graph } from '../dsa/Graph.js';
import { Dijkstra } from '../dsa/Dijkstra.js';
import { Queue } from '../dsa/Queue.js';
import { MergeSort } from '../dsa/MergeSort.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function runTests() {
  console.log('\n=== TESTING 1: MinHeap Priority Queue ===');
  const heap = new MinHeap((a, b) => a.distance - b.distance);
  assert(heap.isEmpty() === true, 'Heap starts empty');
  assert(heap.size() === 0, 'Heap initial size is 0');
  assert(heap.peek() === null, 'Peek on empty heap returns null');
  assert(heap.extractMin() === null, 'ExtractMin on empty heap returns null');

  heap.insert({ id: 'CP3', distance: 150 });
  heap.insert({ id: 'CP1', distance: 40 });
  heap.insert({ id: 'CP4', distance: 80 });
  heap.insert({ id: 'CP2', distance: 120 });
  heap.insert({ id: 'CP0', distance: 10 });

  assert(heap.size() === 5, 'Heap size is 5 after insertions');
  assert(heap.peek().id === 'CP0', 'Peek returns minimum item CP0 (distance 10)');

  const r1 = heap.extractMin();
  assert(r1.id === 'CP0' && r1.distance === 10, '1st extract is CP0 (10)');
  const r2 = heap.extractMin();
  assert(r2.id === 'CP1' && r2.distance === 40, '2nd extract is CP1 (40)');
  const r3 = heap.extractMin();
  assert(r3.id === 'CP4' && r3.distance === 80, '3rd extract is CP4 (80)');
  const r4 = heap.extractMin();
  assert(r4.id === 'CP2' && r4.distance === 120, '4th extract is CP2 (120)');
  const r5 = heap.extractMin();
  assert(r5.id === 'CP3' && r5.distance === 150, '5th extract is CP3 (150)');
  assert(heap.isEmpty() === true, 'Heap is empty after extracting all elements');

  console.log('\n=== TESTING 2: Graph and Dijkstra Algorithm ===');
  const g = new Graph();
  g.addVertex('A', { name: 'Start' });
  g.addVertex('B', { name: 'Mid 1' });
  g.addVertex('C', { name: 'Shortcut' });
  g.addVertex('D', { name: 'Junction' });
  g.addVertex('Finish', { name: 'Finish Line' });
  g.addVertex('Isolated', { name: 'Island' });

  // Add edges
  g.addEdge('A', 'B', 100);
  g.addEdge('A', 'C', 140);
  g.addEdge('B', 'D', 90);
  g.addEdge('C', 'D', 40); // Shortcut: A(140) + C->D(40) = 180 vs A->B(100) + B->D(90) = 190!
  g.addEdge('D', 'Finish', 100);

  // Negative weight rejection
  let caughtNegative = false;
  try {
    g.addEdge('A', 'B', -10);
  } catch (e) {
    caughtNegative = true;
  }
  assert(caughtNegative, 'Graph rejects negative edge weights');

  // Duplicate vertex rejection
  let caughtDuplicate = false;
  try {
    g.addVertex('A');
  } catch (e) {
    caughtDuplicate = true;
  }
  assert(caughtDuplicate, 'Graph rejects duplicate vertex IDs');

  // Dijkstra shortest path calculation
  const res1 = Dijkstra.findShortestPath(g, 'A', 'Finish');
  assert(res1.found === true, 'Dijkstra finds path to Finish');
  assert(res1.totalCost === 280, `Shortest path cost is 280 (A->C->D->Finish). Got: ${res1.totalCost}`);
  assert(JSON.stringify(res1.path) === JSON.stringify(['A', 'C', 'D', 'Finish']), 'Path is correctly reconstructed');

  // Unreachable destination
  const res2 = Dijkstra.findShortestPath(g, 'A', 'Isolated');
  assert(res2.found === false, 'Dijkstra correctly reports unreachable destination');
  assert(res2.totalCost === Infinity, 'Unreachable cost is Infinity');

  // Invalid vertex rejection
  let caughtInvalidStart = false;
  try {
    Dijkstra.findShortestPath(g, 'NonExistent', 'Finish');
  } catch (e) {
    caughtInvalidStart = true;
  }
  assert(caughtInvalidStart, 'Dijkstra rejects non-existent start vertex');

  console.log('\n=== TESTING 3: FIFO Queue (Circular Buffer) ===');
  const q = new Queue(4);
  assert(q.isEmpty() === true, 'Queue starts empty');
  assert(q.size() === 0, 'Queue size is 0');
  assert(q.peek() === null, 'Peek on empty queue returns null');
  assert(q.dequeue() === null, 'Dequeue on empty queue returns null');

  // Enqueue racers
  q.enqueue({ id: 'player', name: 'Player' });
  q.enqueue({ id: 'apex', name: 'Apex' });
  q.enqueue({ id: 'nitro', name: 'Nitro' });
  q.enqueue({ id: 'shadow', name: 'Shadow' });

  assert(q.size() === 4, 'Queue size is 4 after enqueuing 4 racers');
  assert(q.peek().name === 'Player', 'Peek returns front racer (Player)');

  // Dequeue in FIFO order
  const d1 = q.dequeue();
  assert(d1.id === 'player', '1st dequeued is Player');
  const d2 = q.dequeue();
  assert(d2.id === 'apex', '2nd dequeued is Apex');
  const d3 = q.dequeue();
  assert(d3.id === 'nitro', '3rd dequeued is Nitro');
  const d4 = q.dequeue();
  assert(d4.id === 'shadow', '4th dequeued is Shadow');
  assert(q.isEmpty() === true, 'Queue is empty after releasing all racers');

  // Wraparound test
  q.enqueue('R1');
  q.enqueue('R2');
  q.dequeue(); // remove R1
  q.enqueue('R3');
  q.enqueue('R4');
  q.enqueue('R5'); // triggers resize or circular wrap
  assert(q.size() === 4, 'Queue handles circular wraparound correctly');
  assert(q.dequeue() === 'R2', 'Wraparound preserves strict FIFO ordering');

  console.log('\n=== TESTING 4: Merge Sort Leaderboard ===');
  const racers = [
    { racerId: 'shadow', name: 'Shadow', completedLaps: 1, lapProgress: 0.8, isFinished: false },
    { racerId: 'apex', name: 'Apex', completedLaps: 2, lapProgress: 0.2, isFinished: false },
    { racerId: 'player', name: 'Player', completedLaps: 3, lapProgress: 1.0, isFinished: true, finishTimestamp: 125.4 },
    { racerId: 'nitro', name: 'Nitro', completedLaps: 3, lapProgress: 1.0, isFinished: true, finishTimestamp: 120.1 }
  ];

  const sorted = MergeSort.sort(racers);
  assert(sorted.length === 4, 'Sorted list has 4 elements');
  assert(sorted[0].racerId === 'nitro', '1st place is Nitro (finished first at 120.1s)');
  assert(sorted[1].racerId === 'player', '2nd place is Player (finished second at 125.4s)');
  assert(sorted[2].racerId === 'apex', '3rd place is Apex (unfinished, lap 2)');
  assert(sorted[3].racerId === 'shadow', '4th place is Shadow (unfinished, lap 1)');

  // Edge cases
  assert(MergeSort.sort([]).length === 0, 'MergeSort handles empty array');
  assert(MergeSort.sort([racers[0]]).length === 1, 'MergeSort handles single-element array');

  // Equal progress tie break
  const tieRacers = [
    { racerId: 'R2', completedLaps: 1, lapProgress: 0.5, isFinished: false },
    { racerId: 'R1', completedLaps: 1, lapProgress: 0.5, isFinished: false }
  ];
  const sortedTie = MergeSort.sort(tieRacers);
  assert(sortedTie[0].racerId === 'R1' && sortedTie[1].racerId === 'R2', 'Tie-breaker sorts consistently by ID');

  console.log(`\n========================================`);
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
