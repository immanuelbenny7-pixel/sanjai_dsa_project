# ACADEMIC PROJECT REPORT
## STREET RACER: ALGORITHM WARS
### Applied Data Structures and Algorithms in a Real-Time 3D Arcade Racing Game

**Course**: Data Structures and Algorithms (CS 301 / CS 302)  
**Author**: Individual College Project  
**Date**: October 2026  
**Technology Stack**: Three.js, WebGL, JavaScript (ES6 Modules), Vite, Web Audio API  

---

## 1. ABSTRACT

Modern computer games rely heavily on fundamental Computer Science data structures and algorithmic paradigms to solve real-time problems such as spatial navigation, resource prioritization, event scheduling, and real-time state ranking. This project presents **STREET RACER: ALGORITHM WARS**, a playable, real-time 3D arcade car racing game built from scratch using Three.js and vanilla JavaScript. 

Four core Data Structures and Algorithms were manually designed and implemented without relying on built-in language shortcuts (such as `Array.prototype.sort` or `Array.prototype.shift`):
1. **Adjacency-List Graph & Dijkstra's Algorithm**: Models track topologies, interconnected checkpoints, and alternative shortcut routes to compute dynamic, shortest-distance paths for physical AI vehicles.
2. **Binary Min-Heap Priority Queue**: Accelerates checkpoint selection during edge relaxation within Dijkstra's algorithm in $O(\log V)$ time.
3. **Array-Backed Circular FIFO Queue**: Controls the starting grid staging order and sequential launch countdown of racers in $O(1)$ time.
4. **Recursive Merge Sort**: Evaluates continuous circuit progression metrics to rank racers in the live in-game leaderboard and final results screen in $O(n \log n)$ time.

The project additionally integrates an educational **DSA Lab** providing interactive step-by-step visual exploration of all four algorithms, along with a 41-case automated unit test suite.

---

## 2. PROBLEM STATEMENT

In many academic settings, Data Structures and Algorithms (DSA) are studied purely through abstract theoretical exercises, CLI benchmarks, or synthetic leetcode problems. This detachment often obscures their vital role in high-performance, real-time interactive software such as game engines and simulation systems.

Key technical challenges addressed in this project include:
- Modeling a closed-loop 3D racing track with bifurcating and converging paths as a directed, weighted graph.
- Ensuring AI opponents navigate realistic paths smoothly without teleportation, picking shortcuts or optimal routes dynamically.
- Managing starting-grid release order efficiently without incurring the $O(n)$ memory shifting overhead associated with naive dynamic array dequeues.
- Maintaining a strictly sorted, flicker-free leaderboard in real time under continuous position updates and multi-variable ranking rules (finished status, lap counts, segment progress, and tie-breakers).

---

## 3. OBJECTIVES

1. Implement an arcade-grade 3D car racing game in WebGL featuring responsive car physics (acceleration curves, drift mechanics, off-road damping, barrier collisions, and camera spring dynamics).
2. Manually construct four core DSA components in JavaScript following standard CS principles.
3. Integrate each DSA component directly into active gameplay rather than treating them as disconnected side effects.
4. Provide a dual-mode experience:
   - **Quick Race Mode**: 3-lap competitive race against three distinct AI opponents (*Apex*, *Nitro*, *Shadow*).
   - **DSA Lab Mode**: An interactive visualizer allowing users to inspect node relaxation, binary tree heaps, circular memory buffers, and recursive merge steps.
5. Guarantee performance across consumer laptops with 60 FPS rendering and comprehensive automated unit tests.

---

## 4. SYSTEM ARCHITECTURE

The application follows a modular, decoupled architecture separating **Core DSA**, **Game Physics & Simulation**, **3D Rendering & Audio**, and **User Interfaces**.

```
+-------------------------------------------------------------------------+
|                              STREET RACER                               |
|                            (Game Engine)                                |
+-------------------------------------------------------------------------+
       |                                              |
       v                                              v
+-------------------------------+              +--------------------------+
|       3D & Audio Core         |              |        UI & HUD          |
|-------------------------------|              |--------------------------|
| - Three.js WebGL Renderer     |              | - Racing HUD & Minimap   |
| - 3D Track & Road Ribbons     |              | - Main Menu (Turntable)  |
| - Player & AI Sports Cars     |              | - Vehicle Garage         |
| - Chase & Orbit Camera        |              | - DSA Lab Visualizer     |
| - Web Audio Procedural Synth  |              | - Race Results Screen    |
+-------------------------------+              +--------------------------+
       |                                              |
       +----------------------+-----------------------+
                              |
                              v
+-------------------------------------------------------------------------+
|                         ACTIVE DSA PIPELINE                             |
|-------------------------------------------------------------------------|
| 1. Graph (Adjacency List)       : Track checkpoints & road weights      |
| 2. MinHeap Priority Queue       : Extract-Min for Dijkstra edge relax   |
| 3. Dijkstra's Algorithm         : AI waypoint routing & shortcut choice |
| 4. Circular FIFO Queue          : Starting grid launch sequence         |
| 5. Merge Sort Leaderboard       : Real-time progress ranking & sorting  |
+-------------------------------------------------------------------------+
```

---

## 5. DSA IMPLEMENTATION DETAILS

### 5.1 Graph & Track Representation (`src/dsa/Graph.js`)
- **Structure**: Adjacency List using an ES6 `Map` of vertex IDs to vertex records, where each vertex maintains an outgoing edge `Map`.
- **Vertices ($V$)**: Checkpoints positioned along the circuit (`CP_0` through `CP_16`, plus branch vertices `CP_5A`, `CP_6A`, `CP_7A`, `CP_5B`, `CP_6B`, `CP_13A`, `CP_14A`, `CP_13B`, `CP_14B`).
- **Edges ($E$)**: Directed road segments.
- **Edge Weight ($w$)**: Euclidean 3D distance between checkpoints, corresponding to physical road meters.
- **Validation**: Strict rejection of null/duplicate IDs and negative weights (guaranteeing Dijkstra invariants).

### 5.2 Custom Binary Min-Heap (`src/dsa/MinHeap.js`)
- **Structure**: Zero-indexed array where for any node at index $i$:
  - Parent: $\lfloor (i - 1) / 2 \rfloor$
  - Left Child: $2i + 1$
  - Right Child: $2i + 2$
- **Invariant**: $A[\text{parent}(i)] \le A[i]$ for all $i > 0$.
- **Operations**:
  - `insert(item)`: Appends item and executes `bubbleUp()` in $O(\log n)$.
  - `extractMin()`: Swaps root with last element, pops, and executes `bubbleDown()` in $O(\log n)$.
  - `peek()`: Returns root in $O(1)$.
- **Instrumentation**: Tracks comparison counts, swap counts, and operation snapshots for DSA Lab.

### 5.3 Dijkstra's Shortest Path Algorithm (`src/dsa/Dijkstra.js`)
- **Role**: AI vehicles query Dijkstra to compute optimal paths through junctions (e.g. deciding between Outer Loop vs. Neon Shortcut).
- **Process**:
  1. Initialize distance table: $dist[v] = \infty$, $dist[start] = 0$.
  2. Insert $\{ id: start, distance: 0 \}$ into custom `MinHeap`.
  3. While `!heap.isEmpty()`:
     - Extract checkpoint $u$ with minimum tentative distance.
     - If extracted distance $> dist[u]$, discard as stale.
     - If $u == target$, terminate early.
     - For each outgoing edge $(u, v)$ with weight $w$:
       - If $dist[u] + w < dist[v]$:
         - Relax edge: $dist[v] = dist[u] + w$.
         - Set predecessor: $prev[v] = u$.
         - Insert $\{ id: v, distance: dist[v] \}$ into `MinHeap`.
  4. Backtrack via predecessor map to reconstruct exact waypoint sequence.

### 5.4 Circular Array FIFO Queue (`src/dsa/Queue.js`)
- **Role**: Manages the starting grid sequence:
  $$\text{Front} \rightarrow [\text{Player}] \rightarrow [\text{Apex}] \rightarrow [\text{Nitro}] \rightarrow [\text{Shadow}] \leftarrow \text{Rear}$$
- **Avoidance of `Array.shift()`**: Standard JavaScript `Array.shift()` has $O(n)$ time complexity due to index re-allocation. The custom `Queue` uses a circular buffer with fixed initial capacity, pointers `head` and `tail`, and a modulo arithmetic wraparound:
  $$tail = (tail + 1) \pmod{capacity}$$
  $$head = (head + 1) \pmod{capacity}$$
- **Complexity**: $O(1)$ amortized enqueue and $O(1)$ dequeue.

### 5.5 Merge Sort Leaderboard (`src/dsa/MergeSort.js`)
- **Role**: Determines official positions on the live HUD every 200 ms and on race finish.
- **Comparator Invariants**:
  1. Finished racers always precede unfinished racers.
  2. Among finished racers: lower finish timestamp ranks higher.
  3. Among unfinished racers: higher completed laps rank higher.
  4. For racers on the same lap: higher continuous circuit progress metric (0.0 to 1.0) ranks higher.
  5. Tie-break: lexicographical comparison of `racerId`.
- **Implementation**: Pure divide-and-conquer recursion dividing input arrays into left and right halves down to base cases ($|A| \le 1$), merging sorted sub-arrays into new output arrays with instrumented comparison and write counters.

---

## 6. ALGORITHM PSEUDOCODE

### 6.1 Dijkstra with Binary Min-Heap
```text
Algorithm Dijkstra(Graph G, Vertex start, Vertex target):
    dist = Map()
    prev = Map()
    heap = MinHeap()

    for each vertex v in G.vertices:
        dist[v] = INFINITY
        prev[v] = null

    dist[start] = 0
    heap.insert({ vertex: start, distance: 0 })

    while not heap.isEmpty():
        current = heap.extractMin()
        u = current.vertex
        d = current.distance

        if d > dist[u]:
            continue

        if u == target:
            break

        for each edge (u, v, weight) in G.getNeighbors(u):
            newDist = dist[u] + weight
            if newDist < dist[v]:
                dist[v] = newDist
                prev[v] = u
                heap.insert({ vertex: v, distance: newDist })

    // Path Reconstruction
    path = []
    curr = target
    while curr != null:
        path.prepend(curr)
        curr = prev[curr]

    return { path: path, totalCost: dist[target] }
```

### 6.2 Merge Sort for Racing Leaderboard
```text
Algorithm MergeSort(Array A, Comparator C):
    if length(A) <= 1:
        return A

    mid = floor(length(A) / 2)
    left = MergeSort(A[0 ... mid - 1], C)
    right = MergeSort(A[mid ... length(A) - 1], C)

    return Merge(left, right, C)

Algorithm Merge(Array L, Array R, Comparator C):
    result = []
    i = 0, j = 0

    while i < length(L) and j < length(R):
        if C(L[i], R[j]) <= 0:
            result.append(L[i])
            i = i + 1
        else:
            result.append(R[j])
            j = j + 1

    while i < length(L):
        result.append(L[i])
        i = i + 1

    while j < length(R):
        result.append(R[j])
        j = j + 1

    return result
```

---

## 7. TIME AND SPACE COMPLEXITY ANALYSIS

| Algorithm / Data Structure | Operation | Best Case | Average Case | Worst Case | Space Complexity |
|---|---|---|---|---|---|
| **MinHeap** | `insert(x)` | $O(1)$ | $O(\log n)$ | $O(\log n)$ | $O(n)$ |
| **MinHeap** | `extractMin()` | $O(\log n)$ | $O(\log n)$ | $O(\log n)$ | $O(n)$ |
| **MinHeap** | `peek()` | $O(1)$ | $O(1)$ | $O(1)$ | $O(1)$ |
| **Graph** | `addEdge(u, v, w)` | $O(1)$ | $O(1)$ | $O(1)$ | $O(V + E)$ |
| **Dijkstra** | `findShortestPath` | $O(E \log V)$ | $O((V + E) \log V)$ | $O((V + E) \log V)$ | $O(V)$ |
| **FIFO Queue** | `enqueue(x)` | $O(1)$ | $O(1)$ | $O(1)^*$ | $O(n)$ |
| **FIFO Queue** | `dequeue()` | $O(1)$ | $O(1)$ | $O(1)$ | $O(n)$ |
| **Merge Sort** | `sort(A)` | $O(n \log n)$ | $O(n \log n)$ | $O(n \log n)$ | $O(n)$ auxiliary |

$^*$ *Amortized when resizing circular buffer.*

---

## 8. AUTOMATED TEST SUITE & VERIFICATION

An automated test suite (`src/tests/dsa.test.js`) was developed and executed using Node.js (`npm test`). All 41 test assertions passed successfully:

```
=== TESTING 1: MinHeap Priority Queue ===
  ✓ PASS: Heap starts empty
  ✓ PASS: Heap initial size is 0
  ✓ PASS: Peek on empty heap returns null
  ✓ PASS: ExtractMin on empty heap returns null
  ✓ PASS: Heap size is 5 after insertions
  ✓ PASS: Peek returns minimum item CP0 (distance 10)
  ✓ PASS: 1st extract is CP0 (10)
  ✓ PASS: 2nd extract is CP1 (40)
  ✓ PASS: 3rd extract is CP4 (80)
  ✓ PASS: 4th extract is CP2 (120)
  ✓ PASS: 5th extract is CP3 (150)
  ✓ PASS: Heap is empty after extracting all elements

=== TESTING 2: Graph and Dijkstra Algorithm ===
  ✓ PASS: Graph rejects negative edge weights
  ✓ PASS: Graph rejects duplicate vertex IDs
  ✓ PASS: Dijkstra finds path to Finish
  ✓ PASS: Shortest path cost is 280 (A->C->D->Finish). Got: 280
  ✓ PASS: Path is correctly reconstructed
  ✓ PASS: Dijkstra correctly reports unreachable destination
  ✓ PASS: Unreachable cost is Infinity
  ✓ PASS: Dijkstra rejects non-existent start vertex

=== TESTING 3: FIFO Queue (Circular Buffer) ===
  ✓ PASS: Queue starts empty
  ✓ PASS: Queue size is 0
  ✓ PASS: Peek on empty queue returns null
  ✓ PASS: Dequeue on empty queue returns null
  ✓ PASS: Queue size is 4 after enqueuing 4 racers
  ✓ PASS: Peek returns front racer (Player)
  ✓ PASS: 1st dequeued is Player
  ✓ PASS: 2nd dequeued is Apex
  ✓ PASS: 3rd dequeued is Nitro
  ✓ PASS: 4th dequeued is Shadow
  ✓ PASS: Queue is empty after releasing all racers
  ✓ PASS: Queue handles circular wraparound correctly
  ✓ PASS: Wraparound preserves strict FIFO ordering

=== TESTING 4: Merge Sort Leaderboard ===
  ✓ PASS: Sorted list has 4 elements
  ✓ PASS: 1st place is Nitro (finished first at 120.1s)
  ✓ PASS: 2nd place is Player (finished second at 125.4s)
  ✓ PASS: 3rd place is Apex (unfinished, lap 2)
  ✓ PASS: 4th place is Shadow (unfinished, lap 1)
  ✓ PASS: MergeSort handles empty array
  ✓ PASS: MergeSort handles single-element array
  ✓ PASS: Tie-breaker sorts consistently by ID

========================================
Total: 41 | Passed: 41 | Failed: 0
========================================
```

---

## 9. SCREENSHOTS & DEMONSTRATION GUIDE

When capturing project screenshots for presentation submission:
1. **Screenshot 1: Main Menu & 3D Showcase**: Shows the illuminated neon title, 3D sports car turntable, and navigation buttons.
2. **Screenshot 2: Real-time 3D Racing & HUD**: Shows player car in third-person chase perspective, speedometer, minimap with AI positions, and live Merge Sort leaderboard.
3. **Screenshot 3: Alternative Route / Shortcut Split**: Shows Junction 1 with the branching path into the Neon Alley Shortcut.
4. **Screenshot 4: DSA Lab - Graph & Dijkstra**: Shows the topological circuit diagram with the calculated shortest path highlighted in neon green and execution step logs.
5. **Screenshot 5: DSA Lab - Binary Min-Heap**: Shows the visual tree structure and synchronized 0-indexed memory array.
6. **Screenshot 6: DSA Lab - Circular FIFO Queue**: Shows the circular memory ring buffer with Head and Tail pointers.
7. **Screenshot 7: Race Results Podium**: Shows the final race standings table calculated by Merge Sort with best lap times.

---

## 10. CONCLUSION

**STREET RACER: ALGORITHM WARS** proves that fundamental Computer Science data structures and algorithms are not merely abstract concepts, but the primary drivers of real-time interactive simulations. 

By grounding Graph traversal, Priority Queues, Circular Buffers, and Divide-and-Conquer Sorting in an immersive 3D racing environment, the project bridges the gap between academic theory and practical software engineering.

---

## 11. FUTURE ENHANCEMENTS

1. **A\* Search Algorithm**: Introducing Euclidean distance heuristics to accelerate waypoint search over complex multi-tier city maps.
2. **Spatial Hash Grid / Quadtree**: Optimizing collision detection between dozens of simultaneous vehicles from $O(n^2)$ to $O(n)$.
3. **Ghost Replay via Binary Search Trees**: Storing lap telemetry in an AVL or Red-Black Tree keyed by race timestamp for real-time replay interpolation.
