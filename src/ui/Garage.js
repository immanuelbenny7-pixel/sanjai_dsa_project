import { CAR_CONFIGS } from '../vehicles/CarFactory.js';
import { Storage } from '../utils/Storage.js';
import { sound } from '../game/AudioSystem.js';

export class Garage {
  /**
   * @param {import('../game/Game.js').Game} game
   */
  constructor(game) {
    this.game = game;
    this.container = document.getElementById('garage-screen');
    this.selectedCarId = Storage.getItem('sr_selected_car', 'factory_gt');

    // DOM references
    this.carNameEl = document.getElementById('garage-car-name');
    this.carDescEl = document.getElementById('garage-car-desc');
    this.barSpeedEl = document.getElementById('bar-speed');
    this.barAccelEl = document.getElementById('bar-accel');
    this.barHandlingEl = document.getElementById('bar-handling');
    this.barBrakeEl = document.getElementById('bar-brake');
    this.switcherContainer = document.getElementById('garage-car-switcher');
    this.selectBtn = document.getElementById('btn-select-car');
    this.backBtn = document.getElementById('btn-garage-back');

    this.initSwitcher();
    this.bindEvents();
  }

  initSwitcher() {
    if (!this.switcherContainer) return;

    this.switcherContainer.innerHTML = Object.values(CAR_CONFIGS).map(cfg => `
      <button class="car-thumb-btn ${cfg.id === this.selectedCarId ? 'active' : ''}" data-car-id="${cfg.id}">
        ${cfg.name}
      </button>
    `).join('');

    this.switcherContainer.querySelectorAll('.car-thumb-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sound.playClick();
        const carId = e.currentTarget.getAttribute('data-car-id');
        this.previewCar(carId);
      });
    });
  }

  bindEvents() {
    if (this.selectBtn) {
      this.selectBtn.addEventListener('click', () => {
        sound.playClick();
        Storage.setItem('sr_selected_car', this.selectedCarId);
        this.game.setPlayerCarSelection(this.selectedCarId);
        this.selectBtn.textContent = 'SELECTED ✓';
        setTimeout(() => {
          if (this.selectBtn) this.selectBtn.textContent = 'SELECT VEHICLE';
        }, 1200);
      });
    }

    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => {
        sound.playClick();
        this.hide();
        this.game.openMainMenu();
      });
    }
  }

  previewCar(carId) {
    this.selectedCarId = carId;
    const config = CAR_CONFIGS[carId] || CAR_CONFIGS['factory_gt'];

    // Update active button state
    if (this.switcherContainer) {
      this.switcherContainer.querySelectorAll('.car-thumb-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-car-id') === carId);
      });
    }

    if (this.carNameEl) this.carNameEl.textContent = config.name;
    if (this.carDescEl) this.carDescEl.textContent = config.description;

    // Stat bars normalized to 100%
    if (this.barSpeedEl) this.barSpeedEl.style.width = `${Math.min(100, (config.maxSpeed / 70) * 100)}%`;
    if (this.barAccelEl) this.barAccelEl.style.width = `${Math.min(100, (config.acceleration / 35) * 100)}%`;
    if (this.barHandlingEl) this.barHandlingEl.style.width = `${Math.min(100, (config.handling / 3.5) * 100)}%`;
    if (this.barBrakeEl) this.barBrakeEl.style.width = `${Math.min(100, (config.braking / 45) * 100)}%`;

    // Inform 3D game to swap the showcase car
    this.game.showShowcaseCar(carId);
  }

  show() {
    if (this.container) this.container.style.display = 'flex';
    this.previewCar(this.selectedCarId);
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }
}
