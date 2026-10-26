# STREET RACER: ALGORITHM WARS
### A 3D Cyberpunk Arcade Racing Game with Real Data Structures and Algorithms

**STREET RACER: ALGORITHM WARS** is a real-time 3D browser racing game developed using **Three.js**, **WebGL**, and vanilla **JavaScript (ES Modules)**, bundled with **Vite**.

Unlike cosmetic dashboard projects, this game combines real-time arcade vehicle dynamics and competitive AI racing opponents with **four genuine Data Structures and Algorithms (DSA)** that directly govern the physics, AI navigation, starting grid logic, and live race rankings.

---

## 🏁 Key Features

1. **Real-time 3D WebGL World**:
   - Closed-loop asphalt circuit textured with seamless road surfaces.
   - Dynamic track segments with main loops, hairpin turns, and **alternative routes/shortcuts** (e.g., *Neon Alley Shortcut*, *Highway West Boulevard*).
   - Cyberpunk night cityscape with illuminated skyscrapers, glowing neon guardrails, trackside streetlamps, and starting/finish digital gantry.
   - Smooth third-person chase camera with speed-dependent dynamic FOV, spring damping, and collision shake.

2. **Full Arcade Vehicle Physics**:
   - Forward acceleration curves, braking, reverse gears, and speed-sensitive steering dampening.
   - Arcade drifting mechanics with tire slip angle calculation, drift score multiplier, and procedural tire smoke particle effects.
   - Rotating 3D wheels that physically spin with ground speed and steer with steering angle.
   - Dynamic brake lights that illuminate upon deceleration.
   - Car recovery system (`[R]` key) restoring vehicle to the nearest valid checkpoint.
   - Elastic impulse collision resolution against track barriers and opponent racers.

3. **Three Distinct AI Opponents**:
   - **Apex**: Precision cornering specialist that targets tight shortcuts.
   - **Nitro**: Raw acceleration and top-speed muscle car favoring open highway stretches.
   - **Shadow**: High-downforce, stable vehicle maintaining consistent lap times.
   - Opponents use **Dijkstra's Algorithm** (backed by **MinHeap**) over the track graph to navigate waypoints, look ahead to brake before sharp turns, and avoid collisions.

4. **Procedural Web Audio Engine**:
   - Zero external audio files required. Uses browser **Web Audio API** synthesis.
   - Variable RPM engine oscillators modulated by throttle and velocity.
   - Filtered white noise tire screech when drifting.
   - 3-2-1-GO! countdown tones, checkpoint chimes, and victory fanfare chords.

5. **Full Game Modes & Screens**:
   - **Main Menu**: 3D animated turntable car showcase with orbiting camera.
   - **Garage / Vehicle Showroom**: 4 selectable sports cars (*Factory GT*, *Apex Phantom*, *Nitro Blaze*, *Shadow Stealth*) with live stat bars.
   - **Quick Race Mode**: 3-lap competitive race with live HUD, speedometer, minimap, and Merge Sort leaderboard.
   - **Interactive DSA Lab**: Educational laboratory with 4 tabs visualizing each algorithm step-by-step.
   - **Settings & How-to-Play**: Audio volume, mute toggles, and controls guide.

---

## 🧠 The Four Core DSA Implementations

| No. | DSA Component | Implementation File | Role in the Game | Time Complexity |
|---|---|---|---|---|
| 1 | **Graph (Adjacency List)** | `src/dsa/Graph.js` | Represents track checkpoints as vertices and road segments as weighted directed edges. | Space: $O(V + E)$ |
| 2 | **Min-Heap Priority Queue** | `src/dsa/MinHeap.js` | Custom 0-indexed binary heap extracting minimum tentative distance checkpoints during Dijkstra's algorithm. | Insert / Extract: $O(\log n)$, Peek: $O(1)$ |
| 3 | **Dijkstra's Algorithm** | `src/dsa/Dijkstra.js` | Computes optimal shortest routes from current checkpoints to destination/finish line for AI navigation. | $O((V + E) \log V)$ |
| 4 | **FIFO Queue (Circular Buffer)** | `src/dsa/Queue.js` | Array-backed circular queue managing starting grid slots and sequential racer release countdown without `Array.shift()`. | Enqueue / Dequeue: $O(1)$ |
| 5 | **Merge Sort** | `src/dsa/MergeSort.js` | Recursive divide-and-conquer algorithm updating the live racing leaderboard based on completed laps and circuit progress. | $O(n \log n)$ in all cases |

> **Note**: None of the implementations use built-in shortcuts like `Array.prototype.sort()` or `Array.prototype.shift()`.

---

## 🎮 Desktop Controls

| Key | Action |
|---|---|
| **W** / **Arrow Up** | Accelerate |
| **S** / **Arrow Down** | Brake / Reverse |
| **A** / **Arrow Left** | Steer Left |
| **D** / **Arrow Right** | Steer Right |
| **SPACE** | Handbrake / Initiate Drift |
| **R** | Recover car to last safe checkpoint |
| **ESC** | Pause / Resume Race |
| **T** | Toggle floating DSA Telemetry panel |

---

## 🛠️ Technology Stack

- **3D Graphics**: Three.js (WebGL, PerspectiveCamera, ShadowMap, Procedural Meshes & GLTF/OBJ Loader)
- **Language**: JavaScript (ES Modules, Object-Oriented Classes)
- **Styling**: Vanilla CSS3 (Custom Cyberpunk Theme, Glassmorphism, CSS Grid)
- **Audio**: Web Audio API (Oscillators, BiquadFilters, GainNodes)
- **Build & Dev Tool**: Vite 6
- **Storage**: LocalStorage with graceful in-memory fallback

---

## 🚀 Installation & Running

### 1. Prerequisites
Ensure [Node.js](https://nodejs.org/) (v18+ recommended) is installed on your system.

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000/`.

### 4. Run Automated DSA Tests
```bash
npm test
```
Executes the comprehensive test suite in `src/tests/dsa.test.js` validating all 4 DSA components and edge cases.

### 5. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` directory.

---

## 🔬 Interactive DSA Lab

The game includes a dedicated interactive educational suite accessible via the **DSA LAB** button on the Main Menu:

1. **Tab 1: Graph & Dijkstra**:
   - Interactive visual node-link circuit layout.
   - Select any start checkpoint and target checkpoint.
   - Step-by-step path relaxation and tentative distance table.
   - Highlights the final shortest route in neon green with total distance.

2. **Tab 2: Min-Heap**:
   - Live visualization of the binary heap tree and 0-indexed array memory representation.
   - Insert custom checkpoint distance records and watch them bubble up.
   - Extract minimum element with bubble-down animation.
   - Real-time comparison and swap counters.

3. **Tab 3: FIFO Queue**:
   - Visualizes a circular memory buffer with Head (front) and Tail (rear) pointers.
   - Demonstrates starting grid racer enqueue and release dequeue operations in $O(1)$ time.

4. **Tab 4: Merge Sort**:
   - Step-by-step divide-and-conquer animation.
   - Visualizes array splitting into sub-arrays and sequential merge comparisons.
   - Accurate comparison and array-write counters.

---

## 📁 Project Architecture

```
street-racer/
├── index.html                 # Main application HTML with all screens and HUD
├── package.json               # Scripts and dependencies (three, vite)
├── vite.config.js             # Vite configuration
├── README.md                  # Project overview and instructions
├── DSA_REPORT.md              # Academic documentation and algorithm analysis
├── public/                    # Static assets (3D model, textures)
│   └── assets/
│       ├── Seamless-Road-Texture1.jpg
│       └── models/Factory GT/
├── src/
│   ├── main.js                # App bootstrap entry point
│   ├── dsa/                   # Pure DSA implementations
│   │   ├── MinHeap.js         # Custom binary MinHeap priority queue
│   │   ├── Graph.js           # Adjacency list track graph
│   │   ├── Dijkstra.js        # Dijkstra's shortest path algorithm
│   │   ├── Queue.js           # Circular buffer FIFO queue
│   │   └── MergeSort.js       # Recursive divide-and-conquer leaderboard sort
│   ├── game/                  # 3D Game core
│   │   ├── Game.js            # Central orchestrator and render loop
│   │   ├── Track.js           # 3D track, road ribbons, barriers, environment
│   │   ├── Checkpoint.js      # 3D checkpoint trigger gates
│   │   ├── CameraController.js# Smooth chase and orbit camera
│   │   ├── CollisionSystem.js # Car-to-car and car-to-barrier collisions
│   │   ├── RaceManager.js     # Grid queue, lap validation, race state
│   │   └── AudioSystem.js     # Web Audio API procedural sound synthesizer
│   ├── vehicles/              # Vehicles & AI
│   │   ├── CarFactory.js      # 3D sports car builder & specs
│   │   ├── PlayerCar.js       # Player vehicle physics & controls
│   │   └── AICar.js           # AI vehicle with Dijkstra navigation & avoidance
│   ├── ui/                    # UI controllers
│   │   ├── MainMenu.js        # Main menu controller
│   │   ├── RacingHUD.js       # In-game HUD, speedometer, minimap, leaderboard
│   │   ├── Garage.js          # Vehicle selection showroom
│   │   ├── DSALab.js          # Interactive DSA visualization lab
│   │   ├── RaceResults.js     # Podium standings modal
│   │   └── Modals.js          # Settings & How-to-Play popups
│   ├── styles/
│   │   └── main.css           # Responsive cyberpunk styling
│   ├── utils/
│   │   ├── MathUtils.js       # Clamping, lerping, angle normalization
│   │   └── Storage.js         # Safe LocalStorage wrapper
│   └── tests/
│       └── dsa.test.js        # Automated unit tests for DSA modules
```
