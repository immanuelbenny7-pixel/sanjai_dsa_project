import { MinHeap } from '../dsa/MinHeap.js';
import { Queue } from '../dsa/Queue.js';
import { MergeSort } from '../dsa/MergeSort.js';
import { Dijkstra } from '../dsa/Dijkstra.js';
import { sound } from '../game/AudioSystem.js';

export class DSALab {
  /**
   * @param {import('../game/Game.js').Game} game
   */
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('dsa-lab-screen');
    this.activeTab = 'graph';

    // References to canvases
    this.graphCanvas = document.getElementById('canvas-dsa-graph');
    this.heapCanvas = document.getElementById('canvas-dsa-heap');
    this.queueCanvas = document.getElementById('canvas-dsa-queue');
    this.sortCanvas = document.getElementById('canvas-dsa-sort');

    // Contexts
    this.graphCtx = this.graphCanvas ? this.graphCanvas.getContext('2d') : null;
    this.heapCtx = this.heapCanvas ? this.heapCanvas.getContext('2d') : null;
    this.queueCtx = this.queueCanvas ? this.queueCanvas.getContext('2d') : null;
    this.sortCtx = this.sortCanvas ? this.sortCanvas.getContext('2d') : null;

    // DSA instances for Lab interactive playground
    this.labHeap = new MinHeap((a, b) => a.distance - b.distance);
    this.labQueue = new Queue(8);

    // Dijkstra state
    this.dijkstraStart = 'CP_0';
    this.dijkstraTarget = 'CP_8';
    this.dijkstraSteps = [];
    this.dijkstraStepIdx = 0;
    this.dijkstraResult = null;
    this.dijkstraPlaying = false;

    // MergeSort state
    this.sortData = [];
    this.sortSteps = [];
    this.sortStepIdx = 0;
    this.sortTracker = { comparisons: 0, writes: 0, steps: [] };

    this.bindEvents();
    this.initDefaultData();
  }

  initDefaultData() {
    // Populate sample heap data
    this.labHeap.clear();
    this.labHeap.insert({ id: 'CP_0', distance: 0 });
    this.labHeap.insert({ id: 'CP_1', distance: 90 });
    this.labHeap.insert({ id: 'CP_2', distance: 160 });
    this.labHeap.insert({ id: 'CP_3', distance: 260 });
    this.labHeap.insert({ id: 'CP_4', distance: 350 });

    // Populate sample queue data
    this.labQueue.clear();
    this.labQueue.enqueue({ id: 'player', name: 'Player' });
    this.labQueue.enqueue({ id: 'apex', name: 'Apex' });
    this.labQueue.enqueue({ id: 'nitro', name: 'Nitro' });
    this.labQueue.enqueue({ id: 'shadow', name: 'Shadow' });

    // Populate sample leaderboard for Merge Sort
    this.sortData = [
      { id: 'shadow', name: 'Shadow', lap: 1, progress: 85, finished: false },
      { id: 'nitro', name: 'Nitro', lap: 3, progress: 100, finished: true, time: 118.5 },
      { id: 'apex', name: 'Apex', lap: 2, progress: 30, finished: false },
      { id: 'player', name: 'Player', lap: 3, progress: 100, finished: true, time: 122.2 }
    ];
  }

  bindEvents() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.lab-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        sound.playClick();
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Close / Back button
    const backBtn = document.getElementById('btn-dsa-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        sound.playClick();
        this.hide();
        this.game.openMainMenu();
      });
    }

    // Graph & Dijkstra controls
    const runDijkstraBtn = document.getElementById('btn-run-dijkstra');
    const stepDijkstraBtn = document.getElementById('btn-step-dijkstra');
    const resetDijkstraBtn = document.getElementById('btn-reset-dijkstra');

    if (runDijkstraBtn) {
      runDijkstraBtn.addEventListener('click', () => {
        sound.playClick();
        this.executeDijkstra();
      });
    }
    if (stepDijkstraBtn) {
      stepDijkstraBtn.addEventListener('click', () => {
        sound.playClick();
        this.stepDijkstra();
      });
    }
    if (resetDijkstraBtn) {
      resetDijkstraBtn.addEventListener('click', () => {
        sound.playClick();
        this.resetDijkstra();
      });
    }

    // MinHeap controls
    const heapInsertBtn = document.getElementById('btn-heap-insert');
    const heapExtractBtn = document.getElementById('btn-heap-extract');
    const heapResetBtn = document.getElementById('btn-heap-reset');

    if (heapInsertBtn) {
      heapInsertBtn.addEventListener('click', () => {
        sound.playClick();
        const idInput = document.getElementById('heap-input-id');
        const distInput = document.getElementById('heap-input-dist');
        const id = idInput ? idInput.value.trim() || 'CP_X' : 'CP_X';
        const dist = distInput ? parseFloat(distInput.value) || Math.floor(Math.random() * 200) : 50;
        this.labHeap.insert({ id, distance: dist });
        this.renderHeap();
      });
    }
    if (heapExtractBtn) {
      heapExtractBtn.addEventListener('click', () => {
        sound.playClick();
        const min = this.labHeap.extractMin();
        this.renderHeap(min);
      });
    }
    if (heapResetBtn) {
      heapResetBtn.addEventListener('click', () => {
        sound.playClick();
        this.initDefaultData();
        this.renderHeap();
      });
    }

    // Queue controls
    const queueEnqBtn = document.getElementById('btn-queue-enq');
    const queueDeqBtn = document.getElementById('btn-queue-deq');
    const queueResetBtn = document.getElementById('btn-queue-reset');

    if (queueEnqBtn) {
      queueEnqBtn.addEventListener('click', () => {
        sound.playClick();
        const input = document.getElementById('queue-input-name');
        const name = input ? input.value.trim() || 'Racer ' + (this.labQueue.size() + 1) : 'Racer';
        this.labQueue.enqueue({ id: name.toLowerCase(), name });
        this.renderQueue();
      });
    }
    if (queueDeqBtn) {
      queueDeqBtn.addEventListener('click', () => {
        sound.playClick();
        const released = this.labQueue.dequeue();
        this.renderQueue(released);
      });
    }
    if (queueResetBtn) {
      queueResetBtn.addEventListener('click', () => {
        sound.playClick();
        this.initDefaultData();
        this.renderQueue();
      });
    }

    // Merge Sort controls
    const sortRunBtn = document.getElementById('btn-sort-run');
    const sortStepBtn = document.getElementById('btn-sort-step');
    const sortResetBtn = document.getElementById('btn-sort-reset');

    if (sortRunBtn) {
      sortRunBtn.addEventListener('click', () => {
        sound.playClick();
        this.runMergeSort();
      });
    }
    if (sortStepBtn) {
      sortStepBtn.addEventListener('click', () => {
        sound.playClick();
        this.stepMergeSort();
      });
    }
    if (sortResetBtn) {
      sortResetBtn.addEventListener('click', () => {
        sound.playClick();
        this.resetMergeSort();
      });
    }
  }

  switchTab(tab) {
    this.activeTab = tab;

    // Update active tab buttons
    document.querySelectorAll('.lab-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
    });

    // Update panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-pane-${tab}`);
    });

    // Resize & render corresponding canvas
    setTimeout(() => {
      this.renderCurrentTab();
    }, 50);
  }

  show() {
    if (this.container) this.container.style.display = 'flex';
    this.populateNodeSelects();
    this.switchTab(this.activeTab);
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }

  populateNodeSelects() {
    const startSel = document.getElementById('dijkstra-start-select');
    const targetSel = document.getElementById('dijkstra-target-select');
    if (!startSel || !targetSel || !this.game.track) return;

    const ids = this.game.track.graph.getVertexIds();
    const optionsHtml = ids.map(id => `<option value="${id}">${id} (${this.game.track.nodeMeta[id]?.name || ''})</option>`).join('');

    startSel.innerHTML = optionsHtml;
    targetSel.innerHTML = optionsHtml;

    startSel.value = 'CP_0';
    targetSel.value = 'CP_8';

    startSel.addEventListener('change', () => { this.dijkstraStart = startSel.value; });
    targetSel.addEventListener('change', () => { this.dijkstraTarget = targetSel.value; });
  }

  renderCurrentTab() {
    if (this.activeTab === 'graph') this.renderGraph();
    else if (this.activeTab === 'heap') this.renderHeap();
    else if (this.activeTab === 'queue') this.renderQueue();
    else if (this.activeTab === 'sort') this.renderMergeSort();
  }

  // ==========================================
  // TAB 1: GRAPH & DIJKSTRA
  // ==========================================
  executeDijkstra() {
    if (!this.game.track) return;

    const startSel = document.getElementById('dijkstra-start-select');
    const targetSel = document.getElementById('dijkstra-target-select');
    const start = startSel ? startSel.value : 'CP_0';
    const target = targetSel ? targetSel.value : 'CP_8';

    this.dijkstraResult = Dijkstra.findShortestPath(this.game.track.graph, start, target, { recordSteps: true });
    this.dijkstraSteps = this.dijkstraResult.steps;
    this.dijkstraStepIdx = this.dijkstraSteps.length - 1;

    this.updateDijkstraUI();
    this.renderGraph();
  }

  stepDijkstra() {
    if (!this.dijkstraResult) {
      if (!this.game.track) return;
      const start = document.getElementById('dijkstra-start-select')?.value || 'CP_0';
      const target = document.getElementById('dijkstra-target-select')?.value || 'CP_8';
      this.dijkstraResult = Dijkstra.findShortestPath(this.game.track.graph, start, target, { recordSteps: true });
      this.dijkstraSteps = this.dijkstraResult.steps;
      this.dijkstraStepIdx = 0;
    } else {
      if (this.dijkstraStepIdx < this.dijkstraSteps.length - 1) {
        this.dijkstraStepIdx++;
      }
    }
    this.updateDijkstraUI();
    this.renderGraph();
  }

  resetDijkstra() {
    this.dijkstraResult = null;
    this.dijkstraSteps = [];
    this.dijkstraStepIdx = 0;
    this.updateDijkstraUI();
    this.renderGraph();
  }

  updateDijkstraUI() {
    const logEl = document.getElementById('dijkstra-step-log');
    const costEl = document.getElementById('dijkstra-total-cost');
    const pathEl = document.getElementById('dijkstra-path-display');

    if (this.dijkstraResult) {
      if (costEl) costEl.textContent = `${this.dijkstraResult.totalCost.toFixed(1)} m`;
      if (pathEl) pathEl.innerHTML = this.dijkstraResult.path.join(' &rarr; ');
    } else {
      if (costEl) costEl.textContent = '0 m';
      if (pathEl) pathEl.textContent = 'None';
    }

    if (logEl && this.dijkstraSteps[this.dijkstraStepIdx]) {
      const step = this.dijkstraSteps[this.dijkstraStepIdx];
      logEl.innerHTML = `<strong>Step ${this.dijkstraStepIdx + 1}/${this.dijkstraSteps.length}:</strong><br>${step.description}`;
    } else if (logEl) {
      logEl.textContent = 'Ready. Click "Run Dijkstra" or "Step" to begin.';
    }
  }

  renderGraph() {
    if (!this.graphCtx || !this.game.track) return;
    const ctx = this.graphCtx;
    const w = this.graphCanvas.width = this.graphCanvas.clientWidth;
    const h = this.graphCanvas.height = this.graphCanvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    const scaleX = w / 800;
    const scaleZ = h / 650;
    const centerX = w / 2 + 10;
    const centerZ = h / 2 - 10;

    const toX = (x) => centerX + x * scaleX;
    const toY = (z) => centerZ + z * scaleZ;

    const currentStep = this.dijkstraSteps[this.dijkstraStepIdx];
    const shortestPathSet = new Set(this.dijkstraResult?.path || []);

    // 1. Draw Edges
    for (const [from, to] of this.game.track.segmentEdges) {
      const p1 = this.game.track.nodePositions[from];
      const p2 = this.game.track.nodePositions[to];
      if (!p1 || !p2) continue;

      const isPathEdge = this.isEdgeInPath(from, to, this.dijkstraResult?.path);
      const isRelaxed = currentStep?.type === 'relax' && currentStep.from === from && currentStep.to === to;

      ctx.beginPath();
      ctx.moveTo(toX(p1.x), toY(p1.z));
      ctx.lineTo(toX(p2.x), toY(p2.z));

      if (isPathEdge) {
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 5;
      } else if (isRelaxed) {
        ctx.strokeStyle = '#ffb700';
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = 2;
      }
      ctx.stroke();

      // Draw edge weight badge
      const edge = this.game.track.graph.getEdge(from, to);
      if (edge) {
        const mx = (toX(p1.x) + toX(p2.x)) / 2;
        const my = (toY(p1.z) + toY(p2.z)) / 2;
        ctx.fillStyle = '#0c111a';
        ctx.fillRect(mx - 14, my - 8, 28, 16);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeRect(mx - 14, my - 8, 28, 16);
        ctx.fillStyle = isPathEdge ? '#00ff88' : '#7f8fa4';
        ctx.font = '10px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(edge.weight)}`, mx, my + 4);
      }
    }

    // 2. Draw Nodes
    for (const [id, pos] of Object.entries(this.game.track.nodePositions)) {
      const x = toX(pos.x);
      const y = toY(pos.z);
      const isStart = id === this.dijkstraStart;
      const isTarget = id === this.dijkstraTarget;
      const isInPath = shortestPathSet.has(id);
      const isCurrent = currentStep?.current === id;

      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 14 : (isStart || isTarget ? 12 : 9), 0, Math.PI * 2);

      if (isCurrent) {
        ctx.fillStyle = '#ffb700';
      } else if (isStart) {
        ctx.fillStyle = '#00f0ff';
      } else if (isTarget) {
        ctx.fillStyle = '#ff0055';
      } else if (isInPath) {
        ctx.fillStyle = '#00ff88';
      } else {
        ctx.fillStyle = '#162232';
      }
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText(id, x, y - 14);
    }
  }

  isEdgeInPath(from, to, path) {
    if (!path || path.length < 2) return false;
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i] === from && path[i + 1] === to) return true;
    }
    return false;
  }

  // ==========================================
  // TAB 2: MIN-HEAP VISUALIZATION
  // ==========================================
  renderHeap(lastExtracted = null) {
    if (!this.heapCtx) return;
    const ctx = this.heapCtx;
    const w = this.heapCanvas.width = this.heapCanvas.clientWidth;
    const h = this.heapCanvas.height = this.heapCanvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    const snapshot = this.labHeap.getSnapshot();

    // Update stats
    const sizeEl = document.getElementById('heap-stat-size');
    const compEl = document.getElementById('heap-stat-comp');
    const swapEl = document.getElementById('heap-stat-swaps');
    const minEl = document.getElementById('heap-stat-min');

    if (sizeEl) sizeEl.textContent = this.labHeap.size();
    if (compEl) compEl.textContent = this.labHeap.comparisons;
    if (swapEl) swapEl.textContent = this.labHeap.swaps;
    if (minEl) {
      const peek = this.labHeap.peek();
      minEl.textContent = peek ? `${peek.id} (${peek.distance})` : 'Empty';
    }

    if (snapshot.length === 0) {
      ctx.fillStyle = '#7f8fa4';
      ctx.font = '16px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText('Heap is currently empty. Insert items above.', w / 2, h / 2);
      return;
    }

    // 1. Draw Binary Tree
    const treeStartY = 60;
    const levelHeight = 65;
    const nodeCoords = [];

    for (let i = 0; i < snapshot.length; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (Math.pow(2, level) - 1);
      const totalInLevel = Math.pow(2, level);
      const levelWidth = w * 0.9;
      const x = (w / 2) - (levelWidth / 2) + ((posInLevel + 0.5) / totalInLevel) * levelWidth;
      const y = treeStartY + level * levelHeight;
      nodeCoords.push({ x, y });
    }

    // Draw tree branches
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < snapshot.length; i++) {
      const leftChild = 2 * i + 1;
      const rightChild = 2 * i + 2;
      if (leftChild < snapshot.length) {
        ctx.beginPath();
        ctx.moveTo(nodeCoords[i].x, nodeCoords[i].y);
        ctx.lineTo(nodeCoords[leftChild].x, nodeCoords[leftChild].y);
        ctx.stroke();
      }
      if (rightChild < snapshot.length) {
        ctx.beginPath();
        ctx.moveTo(nodeCoords[i].x, nodeCoords[i].y);
        ctx.lineTo(nodeCoords[rightChild].x, nodeCoords[rightChild].y);
        ctx.stroke();
      }
    }

    // Draw tree nodes
    for (let i = 0; i < snapshot.length; i++) {
      const { x, y } = nodeCoords[i];
      const item = snapshot[i];
      const isRoot = i === 0;

      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = isRoot ? '#00ff88' : '#0c1626';
      ctx.fill();
      ctx.strokeStyle = isRoot ? '#00ff88' : '#00f0ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isRoot ? '#000000' : '#ffffff';
      ctx.font = 'bold 11px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.distance}`, x, y + 4);

      ctx.fillStyle = '#7f8fa4';
      ctx.font = '10px Rajdhani';
      ctx.fillText(item.id, x, y + 28);
    }

    // 2. Draw Array Representation below Tree
    const arrY = h - 60;
    const boxW = Math.min(50, (w - 60) / Math.max(1, snapshot.length));
    const startX = (w - boxW * snapshot.length) / 2;

    ctx.fillStyle = '#00f0ff';
    ctx.font = '12px Orbitron';
    ctx.textAlign = 'left';
    ctx.fillText('Array Representation (Zero-Indexed):', 30, arrY - 20);

    for (let i = 0; i < snapshot.length; i++) {
      const bx = startX + i * boxW;
      const item = snapshot[i];

      ctx.fillStyle = i === 0 ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 240, 255, 0.1)';
      ctx.fillRect(bx, arrY, boxW - 4, 34);
      ctx.strokeStyle = i === 0 ? '#00ff88' : '#00f0ff';
      ctx.strokeRect(bx, arrY, boxW - 4, 34);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.distance}`, bx + (boxW - 4) / 2, arrY + 20);

      // Index below
      ctx.fillStyle = '#7f8fa4';
      ctx.font = '10px Rajdhani';
      ctx.fillText(`[${i}]`, bx + (boxW - 4) / 2, arrY + 46);
    }
  }

  // ==========================================
  // TAB 3: FIFO QUEUE VISUALIZATION
  // ==========================================
  renderQueue(lastDequeued = null) {
    if (!this.queueCtx) return;
    const ctx = this.queueCtx;
    const w = this.queueCanvas.width = this.queueCanvas.clientWidth;
    const h = this.queueCanvas.height = this.queueCanvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    const dbg = this.labQueue.getBufferDebug();

    // Stats
    const sizeEl = document.getElementById('queue-stat-size');
    const capEl = document.getElementById('queue-stat-cap');
    const headEl = document.getElementById('queue-stat-head');
    const tailEl = document.getElementById('queue-stat-tail');

    if (sizeEl) sizeEl.textContent = dbg.count;
    if (capEl) capEl.textContent = dbg.capacity;
    if (headEl) headEl.textContent = `Index ${dbg.head}`;
    if (tailEl) tailEl.textContent = `Index ${dbg.tail}`;

    // Draw Circular Buffer
    const centerX = w / 2;
    const centerY = h / 2 - 20;
    const radius = 130;
    const totalSlots = dbg.capacity;

    ctx.fillStyle = '#7f8fa4';
    ctx.font = '13px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('CIRCULAR ARRAY MEMORY BUFFER (O(1) FIFO)', centerX, 40);

    for (let i = 0; i < totalSlots; i++) {
      const angle = (i / totalSlots) * Math.PI * 2 - Math.PI / 2;
      const sx = centerX + Math.cos(angle) * radius;
      const sy = centerY + Math.sin(angle) * radius;
      const item = dbg.buffer[i];
      const isOccupied = item !== undefined;
      const isHead = i === dbg.head && dbg.count > 0;
      const isTail = i === dbg.tail;

      ctx.beginPath();
      ctx.arc(sx, sy, 24, 0, Math.PI * 2);
      ctx.fillStyle = isOccupied ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fill();

      ctx.strokeStyle = isHead ? '#00ff88' : (isTail ? '#ff6600' : 'rgba(0, 240, 255, 0.3)');
      ctx.lineWidth = isHead || isTail ? 3 : 1.5;
      ctx.stroke();

      // Content inside slot
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Orbitron';
      ctx.fillText(isOccupied ? item.name || item.id : '—', sx, sy + 4);

      // Slot index
      ctx.fillStyle = '#7f8fa4';
      ctx.font = '10px Rajdhani';
      ctx.fillText(`[${i}]`, sx, sy - 28);

      // Head / Tail pointer label
      if (isHead) {
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 11px Orbitron';
        ctx.fillText('FRONT (HEAD)', sx, sy + 38);
      } else if (isTail) {
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 11px Orbitron';
        ctx.fillText('REAR (TAIL)', sx, sy + 38);
      }
    }
  }

  // ==========================================
  // TAB 4: MERGE SORT VISUALIZATION
  // ==========================================
  runMergeSort() {
    this.sortTracker = { comparisons: 0, writes: 0, steps: [] };
    const sorted = MergeSort.sort(this.sortData, MergeSort.defaultRacerComparator, this.sortTracker);
    this.sortSteps = this.sortTracker.steps;
    this.sortStepIdx = this.sortSteps.length - 1;
    this.renderMergeSort(sorted);
  }

  stepMergeSort() {
    if (this.sortSteps.length === 0) {
      this.sortTracker = { comparisons: 0, writes: 0, steps: [] };
      MergeSort.sort(this.sortData, MergeSort.defaultRacerComparator, this.sortTracker);
      this.sortSteps = this.sortTracker.steps;
      this.sortStepIdx = 0;
    } else if (this.sortStepIdx < this.sortSteps.length - 1) {
      this.sortStepIdx++;
    }
    this.renderMergeSort();
  }

  resetMergeSort() {
    this.initDefaultData();
    this.sortSteps = [];
    this.sortStepIdx = 0;
    this.sortTracker = { comparisons: 0, writes: 0, steps: [] };
    this.renderMergeSort();
  }

  renderMergeSort(finalSorted = null) {
    if (!this.sortCtx) return;
    const ctx = this.sortCtx;
    const w = this.sortCanvas.width = this.sortCanvas.clientWidth;
    const h = this.sortCanvas.height = this.sortCanvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    // Update stats
    const compEl = document.getElementById('sort-stat-comp');
    const writeEl = document.getElementById('sort-stat-writes');
    const logEl = document.getElementById('sort-step-log');

    if (compEl) compEl.textContent = this.sortTracker.comparisons;
    if (writeEl) writeEl.textContent = this.sortTracker.writes;

    const currentStep = this.sortSteps[this.sortStepIdx];
    if (logEl && currentStep) {
      logEl.innerHTML = `<strong>Step ${this.sortStepIdx + 1}/${this.sortSteps.length} (${currentStep.type.toUpperCase()}):</strong><br>${currentStep.description}`;
    } else if (logEl) {
      logEl.textContent = 'Ready. Click "Run Merge Sort" or "Step" to visualize divide-and-conquer.';
    }

    const itemsToDraw = finalSorted || this.sortData;
    const cardW = 160;
    const cardH = 80;
    const gap = 20;
    const startX = (w - (itemsToDraw.length * (cardW + gap) - gap)) / 2;
    const startY = h / 2 - cardH / 2;

    ctx.fillStyle = '#00f0ff';
    ctx.font = '14px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('LEADERBOARD RECORDS SORTED BY MERGE SORT O(N log N)', w / 2, 40);

    itemsToDraw.forEach((racer, idx) => {
      const cx = startX + idx * (cardW + gap);
      const cy = startY;

      ctx.fillStyle = '#0c1422';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = racer.finished ? '#00ff88' : 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cardW, cardH);

      // Rank badge
      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 12px Orbitron';
      ctx.textAlign = 'left';
      ctx.fillText(`#${idx + 1} ${racer.name}`, cx + 10, cy + 24);

      ctx.fillStyle = '#7f8fa4';
      ctx.font = '11px Rajdhani';
      ctx.fillText(`Lap: ${racer.lap} | Progress: ${racer.progress}%`, cx + 10, cy + 46);

      ctx.fillStyle = racer.finished ? '#00ff88' : '#ffb700';
      ctx.fillText(racer.finished ? `Finished (${racer.time}s)` : 'Racing...', cx + 10, cy + 64);
    });
  }
}
