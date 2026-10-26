import { sound } from '../game/AudioSystem.js';

export class Modals {
  constructor(game) {
    this.game = game;

    // How to Play modal
    this.howToPlayModal = document.getElementById('modal-how-to-play');
    this.closeHowToPlayBtn = document.getElementById('btn-close-how-to-play');

    // Settings modal
    this.settingsModal = document.getElementById('modal-settings');
    this.closeSettingsBtn = document.getElementById('btn-close-settings');
    this.volumeSlider = document.getElementById('settings-volume');
    this.muteCheckbox = document.getElementById('settings-mute');

    this.bindEvents();
  }

  bindEvents() {
    if (this.closeHowToPlayBtn) {
      this.closeHowToPlayBtn.addEventListener('click', () => {
        sound.playClick();
        this.closeHowToPlay();
      });
    }

    if (this.closeSettingsBtn) {
      this.closeSettingsBtn.addEventListener('click', () => {
        sound.playClick();
        this.closeSettings();
      });
    }

    if (this.volumeSlider) {
      this.volumeSlider.value = sound.volume;
      this.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        sound.setVolume(val);
      });
    }

    if (this.muteCheckbox) {
      this.muteCheckbox.checked = sound.isMuted;
      this.muteCheckbox.addEventListener('change', () => {
        sound.toggleMute();
      });
    }
  }

  openHowToPlay() {
    if (this.howToPlayModal) this.howToPlayModal.style.display = 'flex';
  }

  closeHowToPlay() {
    if (this.howToPlayModal) this.howToPlayModal.style.display = 'none';
  }

  openSettings() {
    if (this.settingsModal) {
      if (this.volumeSlider) this.volumeSlider.value = sound.volume;
      if (this.muteCheckbox) this.muteCheckbox.checked = sound.isMuted;
      this.settingsModal.style.display = 'flex';
    }
  }

  closeSettings() {
    if (this.settingsModal) this.settingsModal.style.display = 'none';
  }
}
