/**
 * Safe LocalStorage Wrapper with in-memory fallback
 */
class SafeStorage {
  constructor() {
    this.memoryStore = new Map();
    this.isAvailable = this.checkAvailability();
  }

  checkAvailability() {
    try {
      const testKey = '__sr_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('LocalStorage unavailable. Using in-memory fallback.', e);
      return false;
    }
  }

  getItem(key, defaultValue = null) {
    if (this.isAvailable) {
      try {
        const val = window.localStorage.getItem(key);
        return val !== null ? JSON.parse(val) : defaultValue;
      } catch (e) {
        console.warn(`Error reading key "${key}" from localStorage:`, e);
        return defaultValue;
      }
    }
    return this.memoryStore.has(key) ? this.memoryStore.get(key) : defaultValue;
  }

  setItem(key, value) {
    if (this.isAvailable) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        console.warn(`Error writing key "${key}" to localStorage:`, e);
      }
    }
    this.memoryStore.set(key, value);
    return true;
  }

  removeItem(key) {
    if (this.isAvailable) {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Error removing key "${key}":`, e);
      }
    }
    this.memoryStore.delete(key);
  }
}

export const Storage = new SafeStorage();
