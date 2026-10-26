/**
 * STREET RACER: Audio System
 * Web Audio API procedural synthesizer for arcade racing sounds
 */

import { Storage } from '../utils/Storage.js';

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineGain = null;
    this.screechGain = null;

    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.screechNode = null;

    this.isMuted = Storage.getItem('sr_muted', false);
    this.volume = Storage.getItem('sr_volume', 0.6);
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSound();
      this.setupScreechSound();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio initialization failed (silent fallback):', e);
    }
  }

  ensureContext() {
    try {
      if (!this.ctx) {
        this.init();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      // Audio autoplay policy or device error
    }
  }

  setupEngineSound() {
    if (!this.ctx) return;
    try {
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      // Engine low rumble oscillator (sawtooth)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

      // Harmonic growl oscillator (triangle)
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

      // Filter to give deep muscle car warmth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);

      this.engineOsc1.connect(filter);
      this.engineOsc2.connect(filter);
      filter.connect(this.engineGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
    } catch (e) {
      console.warn('Engine sound setup warning:', e);
    }
  }

  setupScreechSound() {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1100, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(3.0, this.ctx.currentTime);

      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.setValueAtTime(0, this.ctx.currentTime);

      whiteNoise.connect(bandpass);
      bandpass.connect(this.screechGain);
      this.screechGain.connect(this.masterGain);

      whiteNoise.start();
    } catch (e) {
      console.warn('Screech sound setup warning:', e);
    }
  }

  updateEngine(speedNormalized, isAccelerating, isDrifting) {
    if (!this.isInitialized || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const targetFreq = 40 + speedNormalized * 160 + (isAccelerating ? 25 : 0);
      const targetGain = 0.08 + speedNormalized * 0.22;

      if (this.engineOsc1) {
        this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.05);
        this.engineOsc2.frequency.setTargetAtTime(targetFreq * 2.02, now, 0.05);
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
      }

      if (this.screechGain) {
        const screechVol = isDrifting ? Math.min(0.25, speedNormalized * 0.3) : 0;
        this.screechGain.gain.setTargetAtTime(screechVol, now, 0.03);
      }
    } catch (e) {}
  }

  stopEngine() {
    try {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
      if (this.screechGain && this.ctx) {
        this.screechGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
    } catch (e) {}
  }

  playCountdown(count) {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      const isGo = count === 0;
      osc.type = isGo ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.6 : 0.25));

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + (isGo ? 0.6 : 0.25));
    } catch (e) {}
  }

  playCheckpointChime() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } catch (e) {}
  }

  playFinishFanfare() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = this.ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0.2, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.65);
      });
    } catch (e) {}
  }

  playClick() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  playLaserShoot(isAI = false) {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isAI ? 'sawtooth' : 'triangle';
      const startFreq = isAI ? 700 : 1100;
      const endFreq = isAI ? 220 : 350;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playImpact() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      // Sub-punch oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  playShieldBreak() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      [580, 870, 1160].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(100, now + idx * 0.04 + 0.35);

        gain.gain.setValueAtTime(0.25, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.35);
      });
    } catch (e) {}
  }

  playPickupSound() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isMuted) return;

      const now = this.ctx.currentTime;
      [440, 660, 880, 1320].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.18, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.15);
      });
    } catch (e) {}
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    Storage.setItem('sr_muted', this.isMuted);
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      } catch (e) {}
    }
    return this.isMuted;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    Storage.setItem('sr_volume', this.volume);
    if (this.masterGain && this.ctx && !this.isMuted) {
      try {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch (e) {}
    }
  }
}

export const sound = new AudioSystem();
