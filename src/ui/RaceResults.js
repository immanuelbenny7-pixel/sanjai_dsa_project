import { sound } from '../game/AudioSystem.js';
import { MathUtils } from '../utils/MathUtils.js';

export class RaceResults {
  /**
   * @param {import('../game/Game.js').Game} game
   */
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('results-screen');

    this.titleEl = document.getElementById('results-title');
    this.tbodyEl = document.getElementById('results-tbody');
    this.bestLapEl = document.getElementById('results-best-lap');
    this.totalTimeEl = document.getElementById('results-total-time');

    this.restartBtn = document.getElementById('btn-results-restart');
    this.menuBtn = document.getElementById('btn-results-menu');

    this.bindEvents();
  }

  bindEvents() {
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => {
        sound.playClick();
        this.hide();
        this.game.startRace();
      });
    }

    if (this.menuBtn) {
      this.menuBtn.addEventListener('click', () => {
        sound.playClick();
        this.hide();
        this.game.openMainMenu();
      });
    }
  }

  show(results) {
    if (!this.container || !results) return;

    if (this.titleEl) {
      this.titleEl.textContent = results.playerWon ? 'VICTORY!' : 'RACE COMPLETE';
      this.titleEl.style.color = results.playerWon ? 'var(--neon-gold)' : 'var(--neon-cyan)';
    }

    if (this.bestLapEl) {
      this.bestLapEl.textContent = MathUtils.formatTime(results.bestLapTime);
    }

    if (this.totalTimeEl) {
      this.totalTimeEl.textContent = MathUtils.formatTime(results.totalRaceTime);
    }

    if (this.tbodyEl && results.leaderboard) {
      this.tbodyEl.innerHTML = results.leaderboard.map((r, i) => {
        const isPlayer = r.racerId === 'player';
        const colHex = '#' + r.color.toString(16).padStart(6, '0');
        const timeStr = r.isFinished ? MathUtils.formatTime(r.finishTimestamp) : 'DNF';
        return `
          <tr style="${isPlayer ? 'background:rgba(0,240,255,0.15);font-weight:700;color:#00f0ff;' : ''}">
            <td>#${i + 1}</td>
            <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${colHex};margin-right:8px;"></span>${r.name}</td>
            <td>${Math.min(3, r.completedLaps)} / 3</td>
            <td>${timeStr}</td>
          </tr>
        `;
      }).join('');
    }

    this.container.style.display = 'flex';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }
}
