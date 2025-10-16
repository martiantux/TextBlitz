// Element locking system to prevent concurrent expansions
export class ElementLockManager {
  private locks: WeakMap<HTMLElement, LockInfo> = new WeakMap();
  private static instance: ElementLockManager;

  private constructor() {}

  static getInstance(): ElementLockManager {
    if (!ElementLockManager.instance) {
      ElementLockManager.instance = new ElementLockManager();
    }
    return ElementLockManager.instance;
  }

  isLocked(element: HTMLElement): boolean {
    const lock = this.locks.get(element);
    if (!lock) return false;

    // Check if still in cooldown period
    const now = Date.now();
    if (now - lock.lastExpansion < lock.cooldownMs) {
      return true;
    }

    // Cooldown expired, not locked
    return false;
  }

  lock(element: HTMLElement, cooldownMs: number = 500): boolean {
    if (this.isLocked(element)) {
      return false; // Already locked
    }

    this.locks.set(element, {
      locked: true,
      lastExpansion: Date.now(),
      cooldownMs
    });

    return true;
  }

  unlock(element: HTMLElement): void {
    const lock = this.locks.get(element);
    if (lock) {
      lock.locked = false;
      lock.lastExpansion = Date.now();
    }
  }

  // Mark element as failed to prevent retry loops
  markFailed(element: HTMLElement): void {
    this.locks.set(element, {
      locked: true,
      lastExpansion: Date.now(),
      cooldownMs: 5000 // 5 second cooldown for failures
    });
  }
}

interface LockInfo {
  locked: boolean;
  lastExpansion: number;
  cooldownMs: number;
}
