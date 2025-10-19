import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementLockManager } from '../../../src/lib/element-lock';

describe('ElementLockManager', () => {
  let lockManager: ElementLockManager;
  let element1: HTMLElement;
  let element2: HTMLElement;

  beforeEach(() => {
    lockManager = ElementLockManager.getInstance();
    // Create mock elements
    element1 = document.createElement('input');
    element2 = document.createElement('textarea');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ElementLockManager.getInstance();
      const instance2 = ElementLockManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('lock and isLocked', () => {
    it('should lock element', () => {
      const locked = lockManager.lock(element1);

      expect(locked).toBe(true);
      expect(lockManager.isLocked(element1)).toBe(true);
    });

    it('should not lock already locked element', () => {
      lockManager.lock(element1);
      const secondLock = lockManager.lock(element1);

      expect(secondLock).toBe(false);
    });

    it('should track multiple elements independently', () => {
      lockManager.lock(element1);

      expect(lockManager.isLocked(element1)).toBe(true);
      expect(lockManager.isLocked(element2)).toBe(false);
    });

    it('should unlock after cooldown period', () => {
      lockManager.lock(element1, 500);

      expect(lockManager.isLocked(element1)).toBe(true);

      // Advance time past cooldown
      vi.advanceTimersByTime(501);

      expect(lockManager.isLocked(element1)).toBe(false);
    });

    it('should remain locked during cooldown', () => {
      lockManager.lock(element1, 500);

      // Advance time but not past cooldown
      vi.advanceTimersByTime(400);

      expect(lockManager.isLocked(element1)).toBe(true);
    });

    it('should use custom cooldown duration', () => {
      lockManager.lock(element1, 1000);

      vi.advanceTimersByTime(500);
      expect(lockManager.isLocked(element1)).toBe(true);

      vi.advanceTimersByTime(501);
      expect(lockManager.isLocked(element1)).toBe(false);
    });
  });

  describe('unlock', () => {
    it('should reset cooldown timer on unlock', () => {
      lockManager.lock(element1, 500);

      // Advance time partway
      vi.advanceTimersByTime(200);

      // Unlock resets the timer
      lockManager.unlock(element1);

      // Should be unlocked after cooldown from unlock time
      vi.advanceTimersByTime(501);
      expect(lockManager.isLocked(element1)).toBe(false);
    });

    it('should handle unlock on non-locked element', () => {
      // Should not throw
      expect(() => lockManager.unlock(element1)).not.toThrow();
    });
  });

  describe('markFailed', () => {
    it('should lock element with failure cooldown', () => {
      lockManager.markFailed(element1);

      expect(lockManager.isLocked(element1)).toBe(true);

      // Should still be locked after normal cooldown
      vi.advanceTimersByTime(500);
      expect(lockManager.isLocked(element1)).toBe(true);

      // Should unlock after 5 second failure cooldown
      vi.advanceTimersByTime(4501);
      expect(lockManager.isLocked(element1)).toBe(false);
    });

    it('should override existing lock', () => {
      lockManager.lock(element1, 100);

      // Mark as failed
      lockManager.markFailed(element1);

      // Should still be locked after short cooldown expires
      vi.advanceTimersByTime(200);
      expect(lockManager.isLocked(element1)).toBe(true);

      // But unlocked after failure cooldown
      vi.advanceTimersByTime(4900);
      expect(lockManager.isLocked(element1)).toBe(false);
    });
  });

  describe('memory management', () => {
    it('should use WeakMap to avoid memory leaks', () => {
      // Create element in local scope
      let tempElement: HTMLElement | null = document.createElement('div');

      lockManager.lock(tempElement);
      expect(lockManager.isLocked(tempElement)).toBe(true);

      // Clear reference
      tempElement = null;

      // WeakMap should allow garbage collection
      // (Can't directly test GC, but ensures correct data structure is used)
      expect(lockManager['locks']).toBeInstanceOf(WeakMap);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid lock/unlock cycles', () => {
      lockManager.lock(element1, 500);
      expect(lockManager.isLocked(element1)).toBe(true);

      lockManager.unlock(element1);
      // After unlock, still in cooldown period
      expect(lockManager.isLocked(element1)).toBe(true);

      // Try to lock again - should fail because still in cooldown
      const secondLock = lockManager.lock(element1);
      expect(secondLock).toBe(false);
    });

    it('should handle concurrent operations on different elements', () => {
      lockManager.lock(element1, 100);
      lockManager.lock(element2, 200);

      vi.advanceTimersByTime(150);

      expect(lockManager.isLocked(element1)).toBe(false);
      expect(lockManager.isLocked(element2)).toBe(true);
    });

    it('should handle zero cooldown', () => {
      lockManager.lock(element1, 0);

      expect(lockManager.isLocked(element1)).toBe(false);
    });
  });
});
