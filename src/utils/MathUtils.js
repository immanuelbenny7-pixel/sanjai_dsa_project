/**
 * Math utilities for 3D Car Racing and Track geometry
 */

export const MathUtils = {
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  lerp(start, end, t) {
    return start + (end - start) * t;
  },

  damp(current, target, smoothing, dt) {
    return this.lerp(current, target, 1 - Math.exp(-smoothing * dt));
  },

  normalizeAngle(angle) {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  },

  lerpAngle(a, b, t) {
    let diff = this.normalizeAngle(b - a);
    return a + diff * t;
  },

  degToRad(deg) {
    return (deg * Math.PI) / 180;
  },

  radToDeg(rad) {
    return (rad * 180) / Math.PI;
  },

  formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00.000';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  },

  distance2D(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dz * dz);
  }
};
