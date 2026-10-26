import { sound } from '../game/AudioSystem.js';

export class MainMenu {
  /**
   * @param {import('../game/Game.js').Game} game
   */
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('main-menu');

    this.playBtn = document.getElementById('btn-play');
    this.dsaLabBtn = document.getElementById('btn-dsa-lab');
    this.garageBtn = document.getElementById('btn-garage');
    this.howToPlayBtn = document.getElementById('btn-how-to-play');
    this.settingsBtn = document.getElementById('btn-settings');

    this.bindEvents();
  }

  attachButtonAction(btn, actionName, callback) {
    if (!btn) {
      console.warn(`[MainMenu] Button for ${actionName} not found in DOM!`);
      return;
    }

    const handler = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      console.log(`[MainMenu] Executing ${actionName}`);
      try {
        sound.playClick();
      } catch (err) {}
      callback();
    };

    btn.onclick = handler;
    btn.addEventListener('click', handler);
  }

  bindEvents() {
    this.attachButtonAction(this.playBtn, 'PLAY RACE', () => {
      this.game.startRace();
    });

    this.attachButtonAction(this.dsaLabBtn, 'DSA LAB', () => {
      this.game.openDSALab();
    });

    this.attachButtonAction(this.garageBtn, 'GARAGE', () => {
      this.game.openGarage();
    });

    this.attachButtonAction(this.howToPlayBtn, 'HOW TO PLAY', () => {
      this.game.openHowToPlay();
    });

    this.attachButtonAction(this.settingsBtn, 'SETTINGS', () => {
      this.game.openSettings();
    });
  }

  show() {
    if (this.container) {
      this.container.style.display = 'flex';
      this.container.style.pointerEvents = 'auto';
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      this.container.style.pointerEvents = 'none';
    }
  }
}
