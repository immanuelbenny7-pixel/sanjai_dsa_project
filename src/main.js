import { Game } from './game/Game.js';

// Global dispatchers for direct, fail-safe button invocation
window.playRace = function() {
  console.log('[Global] playRace clicked');
  if (window.__STREET_RACER_GAME__) {
    window.__STREET_RACER_GAME__.startRace();
  } else {
    console.warn('[Global] Game engine still loading, retrying in 300ms...');
    setTimeout(() => {
      if (window.__STREET_RACER_GAME__) window.__STREET_RACER_GAME__.startRace();
    }, 300);
  }
};

window.openGarage = function() {
  console.log('[Global] openGarage clicked');
  if (window.__STREET_RACER_GAME__) {
    window.__STREET_RACER_GAME__.openGarage();
  }
};

window.openDSALab = function() {
  console.log('[Global] openDSALab clicked');
  if (window.__STREET_RACER_GAME__) {
    window.__STREET_RACER_GAME__.openDSALab();
  }
};

window.openHowToPlay = function() {
  console.log('[Global] openHowToPlay clicked');
  if (window.__STREET_RACER_GAME__) {
    window.__STREET_RACER_GAME__.openHowToPlay();
  }
};

window.closeHowToPlay = function() {
  console.log('[Global] closeHowToPlay clicked');
  if (window.__STREET_RACER_GAME__ && window.__STREET_RACER_GAME__.modals) {
    window.__STREET_RACER_GAME__.modals.closeHowToPlay();
  }
};

window.openSettings = function() {
  console.log('[Global] openSettings clicked');
  if (window.__STREET_RACER_GAME__) {
    window.__STREET_RACER_GAME__.openSettings();
  }
};

window.closeSettings = function() {
  console.log('[Global] closeSettings clicked');
  if (window.__STREET_RACER_GAME__ && window.__STREET_RACER_GAME__.modals) {
    window.__STREET_RACER_GAME__.modals.closeSettings();
  }
};

window.openMainMenu = function() {
  console.log('[Global] openMainMenu clicked');
  if (window.__STREET_RACER_GAME__) {
    window.__STREET_RACER_GAME__.openMainMenu();
  }
};

function bootGame() {
  if (window.__STREET_RACER_GAME__) return;

  try {
    console.log('[STREET RACER] Booting game engine...');
    const game = new Game();
    window.__STREET_RACER_GAME__ = game;
    console.log('[STREET RACER] Game engine and Three.js successfully initialized!');
  } catch (err) {
    console.error('[STREET RACER] Fatal initialization error:', err);
  }
}

// Immediate execution if ready or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}
