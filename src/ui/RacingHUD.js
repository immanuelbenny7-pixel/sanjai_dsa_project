import { MathUtils } from '../utils/MathUtils.js';

export class RacingHUD {
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('racing-hud');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // DOM Elements
    this.posEl = document.getElementById('hud-pos-val');
    this.posSuffixEl = document.getElementById('hud-pos-suffix');
    this.lapEl = document.getElementById('hud-lap-val');
    this.timerEl = document.getElementById('hud-timer-val');
    this.countdownEl = document.getElementById('countdown-banner');
    this.bannerMsgEl = document.getElementById('hud-banner-msg');

    this.speedoNumEl = document.getElementById('speedo-num');
    this.speedoFillEl = document.getElementById('speedo-bar-fill');
    this.driftBadgeEl = document.getElementById('drift-badge');
    this.leaderboardBodyEl = document.getElementById('leaderboard-body');

    // Combat HUD Elements
    this.combatMsgEl = document.getElementById('hud-combat-msg');
    this.ammoValEl = document.getElementById('hud-ammo-val');
    this.ammoMaxEl = document.getElementById('hud-ammo-max');
    this.weaponStatusEl = document.getElementById('hud-weapon-status');
    this.cooldownFillEl = document.getElementById('cooldown-bar-fill');
    this.shieldValEl = document.getElementById('hud-shield-val');
    this.shieldFillEl = document.getElementById('shield-bar-fill');

    this.dsaToggleBtn = document.getElementById('dsa-hud-toggle');
    this.dsaPanel = document.getElementById('dsa-telemetry-panel');
    this.dsaContentEl = document.getElementById('dsa-telemetry-content');

    this.isDsaVisible = false;
    this.initEvents();
  }

  initEvents() {
    if (this.dsaToggleBtn) {
      this.dsaToggleBtn.addEventListener('click', () => {
        this.isDsaVisible = !this.isDsaVisible;
        if (this.dsaPanel) {
          this.dsaPanel.style.display = this.isDsaVisible ? 'block' : 'none';
        }
      });
    }
  }

  show() {
    if (this.container) this.container.style.display = 'grid';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
    if (this.dsaPanel) this.dsaPanel.style.display = 'none';
  }

  setCountdown(number, text) {
    if (!this.countdownEl) return;
    if (number < 0) {
      this.countdownEl.style.display = 'none';
    } else {
      this.countdownEl.style.display = 'block';
      this.countdownEl.textContent = text;
      if (number === 0) {
        setTimeout(() => {
          if (this.countdownEl) this.countdownEl.style.display = 'none';
        }, 1200);
      }
    }
  }

  showNotification(text, durationMs = 2000) {
    if (!this.bannerMsgEl) return;
    this.bannerMsgEl.textContent = text;
    this.bannerMsgEl.style.display = 'block';
    clearTimeout(this.notifTimeout);
    this.notifTimeout = setTimeout(() => {
      if (this.bannerMsgEl) this.bannerMsgEl.style.display = 'none';
    }, durationMs);
  }

  showCombatNotice(text, durationMs = 1500) {
    if (!this.combatMsgEl) return;
    this.combatMsgEl.textContent = text;
    this.combatMsgEl.style.display = 'block';
    clearTimeout(this.combatNoticeTimeout);
    this.combatNoticeTimeout = setTimeout(() => {
      if (this.combatMsgEl) this.combatMsgEl.style.display = 'none';
    }, durationMs);
  }

  update(playerCar, raceManager, track) {
    if (!playerCar || !raceManager) return;

    // 1. Position & Lap
    const pos = raceManager.getPlayerStanding();
    if (this.posEl) this.posEl.textContent = pos;
    if (this.posSuffixEl) {
      const suffixes = ['ST', 'ND', 'RD', 'TH'];
      this.posSuffixEl.textContent = suffixes[Math.min(pos - 1, 3)];
    }

    if (this.lapEl) {
      const currentLapDisplay = Math.min(raceManager.totalLaps, playerCar.completedLaps + 1);
      this.lapEl.textContent = `${currentLapDisplay} / ${raceManager.totalLaps}`;
    }

    if (this.timerEl) {
      this.timerEl.textContent = MathUtils.formatTime(raceManager.raceTimer);
    }

    // 2. Speedometer (convert m/s to km/h: * 3.6)
    const speedKmh = Math.max(0, Math.round(playerCar.speed * 3.6));
    if (this.speedoNumEl) this.speedoNumEl.textContent = speedKmh;
    if (this.speedoFillEl) {
      const pct = Math.min(100, (Math.abs(playerCar.speed) / playerCar.maxSpeed) * 100);
      this.speedoFillEl.style.width = `${pct}%`;
    }

    // 3. Combat Weapon & Shield Status
    if (this.ammoValEl) this.ammoValEl.textContent = playerCar.ammo;
    if (this.ammoMaxEl) this.ammoMaxEl.textContent = playerCar.maxAmmo;

    if (this.weaponStatusEl) {
      if (playerCar.ammo <= 0) {
        this.weaponStatusEl.textContent = 'NO AMMO';
        this.weaponStatusEl.className = 'weapon-status-empty';
      } else if (playerCar.weaponCooldown > 0) {
        this.weaponStatusEl.textContent = 'RELOAD';
        this.weaponStatusEl.className = 'weapon-status-reload';
      } else {
        this.weaponStatusEl.textContent = 'READY';
        this.weaponStatusEl.className = 'weapon-status-ready';
      }
    }

    if (this.cooldownFillEl) {
      const maxCooldown = 0.35;
      const cooldownPct = playerCar.weaponCooldown > 0
        ? Math.max(0, 100 - (playerCar.weaponCooldown / maxCooldown) * 100)
        : 100;
      this.cooldownFillEl.style.width = `${cooldownPct}%`;
    }

    if (this.shieldValEl) {
      this.shieldValEl.textContent = Math.round(playerCar.shield);
    }

    if (this.shieldFillEl) {
      const shieldPct = Math.max(0, Math.min(100, (playerCar.shield / playerCar.maxShield) * 100));
      this.shieldFillEl.style.width = `${shieldPct}%`;
      if (playerCar.isShieldBroken) {
        this.shieldFillEl.style.background = '#ff2222';
      } else if (shieldPct < 40) {
        this.shieldFillEl.style.background = 'linear-gradient(90deg, #ff2222, #ff8800)';
      } else {
        this.shieldFillEl.style.background = 'linear-gradient(90deg, #ffaa00, #00ff88)';
      }
    }

    // 4. Drift indicator
    if (this.driftBadgeEl) {
      if (playerCar.isDrifting) {
        this.driftBadgeEl.style.opacity = '1';
        this.driftBadgeEl.textContent = `DRIFT +${Math.round(playerCar.driftScore)}`;
      } else {
        this.driftBadgeEl.style.opacity = '0';
      }
    }

    // 5. Live Merge Sort Leaderboard
    this.renderLeaderboard(raceManager.leaderboard);

    // 6. Minimap rendering
    this.renderMinimap(track, raceManager.allCars);

    // 7. DSA Live Telemetry Panel
    if (this.isDsaVisible && this.dsaContentEl) {
      this.renderDsaTelemetry(playerCar, raceManager, track);
    }
  }

  renderLeaderboard(leaderboard) {
    if (!this.leaderboardBodyEl || !leaderboard) return;

    this.leaderboardBodyEl.innerHTML = leaderboard.map((racer, index) => {
      const isPlayer = racer.racerId === 'player';
      const rowClass = isPlayer ? 'lb-row player-row' : 'lb-row';
      const colHex = '#' + racer.color.toString(16).padStart(6, '0');
      const timeStr = racer.isFinished
        ? MathUtils.formatTime(racer.finishTimestamp)
        : `Lap ${Math.min(3, racer.completedLaps + 1)}`;

      return `
        <div class="${rowClass}">
          <span class="lb-pos">${index + 1}</span>
          <span style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colHex};"></span>
            ${racer.name}
          </span>
          <span style="font-size:0.8rem;color:#00f0ff;">${Math.round(racer.lapProgress * 100)}%</span>
          <span style="text-align:right;font-size:0.85rem;color:${racer.isFinished ? '#00ff88' : '#aaa'};">${timeStr}</span>
        </div>
      `;
    }).join('');
  }

  renderMinimap(track, allCars) {
    if (!this.minimapCtx || !track) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // World to minimap transform
    // World bounds approximately: X: -350 to 380, Z: -320 to 250
    const scaleX = w / 800;
    const scaleZ = h / 650;
    const centerX = w / 2 + 10;
    const centerZ = h / 2 - 10;

    const toMapX = (x) => centerX + x * scaleX;
    const toMapZ = (z) => centerZ + z * scaleZ;

    // Draw track circuit road connections
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (const [fromId, toId] of track.segmentEdges) {
      const p1 = track.nodePositions[fromId];
      const p2 = track.nodePositions[toId];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(toMapX(p1.x), toMapZ(p1.z));
        ctx.lineTo(toMapX(p2.x), toMapZ(p2.z));

        // Highlight shortcuts with orange
        const isShortcut = fromId.includes('B') || toId.includes('B');
        ctx.strokeStyle = isShortcut ? 'rgba(255, 102, 0, 0.7)' : 'rgba(0, 240, 255, 0.35)';
        ctx.stroke();
      }
    }

    // Draw checkpoints
    for (const [id, pos] of Object.entries(track.nodePositions)) {
      ctx.fillStyle = id === 'CP_0' ? '#00ff88' : 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(toMapX(pos.x), toMapZ(pos.z), id === 'CP_0' ? 4 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw racers
    for (const car of allCars) {
      const isPlayer = car.racerId === 'player';
      const mx = toMapX(car.position.x);
      const mz = toMapZ(car.position.z);

      ctx.fillStyle = isPlayer ? '#00f0ff' : '#' + car.color.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.arc(mx, mz, isPlayer ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Heading pointer
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, mz);
      ctx.lineTo(mx + Math.sin(car.heading) * 8, mz + Math.cos(car.heading) * 8);
      ctx.stroke();
    }
  }

  renderDsaTelemetry(playerCar, raceManager, track) {
    this.dsaContentEl.innerHTML = `
      <div style="margin-bottom:8px;">
        <span style="color:#00f0ff;font-weight:700;">1. GRAPH + DIJKSTRA:</span><br>
        Current Node: <strong>${playerCar.currentCheckpointId}</strong><br>
        Next Waypoint: <strong>${playerCar.nextCheckpointId}</strong><br>
        Shortest Path to Finish (Dijkstra):<br>
        <span style="color:#00ff88;font-size:0.8rem;">${this.getShortestPathSummary(playerCar, track)}</span>
      </div>
      <div style="margin-bottom:8px;">
        <span style="color:#ffb700;font-weight:700;">2. MIN-HEAP PRIORITY QUEUE:</span><br>
        Extract-Min used for path relaxation.<br>
        Dijkstra Heap inserts: Active on demand.
      </div>
      <div style="margin-bottom:8px;">
        <span style="color:#ff6600;font-weight:700;">3. FIFO STARTING QUEUE:</span><br>
        Grid Order: Player &rarr; Apex &rarr; Nitro &rarr; Shadow<br>
        Released Count: <strong>${raceManager.releasedRacers.size} / 4</strong> racers
      </div>
      <div style="margin-bottom:8px;">
        <span style="color:#00ffcc;font-weight:700;">4. MERGE SORT LEADERBOARD:</span><br>
        Real-time divide-and-conquer ranker.<br>
        Comparisons: O(N log N) active updates.
      </div>
      <div>
        <span style="color:#00f0ff;font-weight:700;">5. OBJECT POOL (PROJECTILES):</span><br>
        O(1) Array Pool avoiding GC stutter.<br>
        <span style="color:#00ff88;font-size:0.8rem;">${this.getPoolSummary()}</span>
      </div>
    `;
  }

  getPoolSummary() {
    if (this.game && this.game.combatSystem && this.game.combatSystem.projectilePool) {
      const t = this.game.combatSystem.projectilePool.getTelemetry();
      return `Capacity: ${t.capacity} | Active: ${t.activeCount} | Acquired: ${t.totalAcquired} | Reclaimed: ${t.totalReleased}`;
    }
    return 'Preallocated 40 slots, O(1) ops';
  }

  getShortestPathSummary(car, track) {
    try {
      const res = Dijkstra.findShortestPath(track.graph, car.currentCheckpointId, 'CP_0');
      return res.found ? res.path.join(' &rarr; ') + ` (${res.totalCost.toFixed(0)}m)` : 'Finish reached';
    } catch (e) {
      return 'Calculating...';
    }
  }
}
