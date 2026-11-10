import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishSessionInvalidation, subscribeToSessionInvalidation } from './sessionInvalidation.ts';

describe('cross-tab session invalidation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes only an opaque, transient storage signal', () => {
    // Vitest's default jsdom origin may be opaque and reject real localStorage.
    // Inject a deterministic storage surface to exercise the fallback contract.
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const storage = {
      setItem: vi.fn(),
      removeItem: vi.fn(),
      getItem: vi.fn().mockReturnValue(null),
    };
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
    try {
      publishSessionInvalidation();

      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(storage.setItem.mock.calls[0][0]).toBe('safer:session-boundary-signal');
      expect(storage.setItem.mock.calls[0][1]).toBeTruthy();
      expect(storage.setItem.mock.calls[0][1]).not.toMatch(/user|org|role|personnel|incident/i);
      expect(storage.removeItem).toHaveBeenCalledWith('safer:session-boundary-signal');
      expect(storage.getItem('safer:session-boundary-signal')).toBeNull();
    } finally {
      if (originalDescriptor) Object.defineProperty(window, 'localStorage', originalDescriptor);
      else Reflect.deleteProperty(window, 'localStorage');
    }
  });

  it('notifies a tab when another tab publishes a storage invalidation', () => {
    const onInvalidated = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(onInvalidated);
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'safer:session-boundary-signal',
      newValue: 'remote-session-change',
    }));

    expect(onInvalidated).toHaveBeenCalledTimes(1);
    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'safer:session-boundary-signal',
      newValue: 'later-session-change',
    }));
    expect(onInvalidated).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated storage events and empty removal events', () => {
    const onInvalidated = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(onInvalidated);
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated', newValue: 'x' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'safer:session-boundary-signal', newValue: null }));
    expect(onInvalidated).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('delivers each unique cross-tab boundary once to every active subscriber', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = subscribeToSessionInvalidation(first);
    const unsubscribeSecond = subscribeToSessionInvalidation(second);

    const signal = (nonce: string) => window.dispatchEvent(new StorageEvent('storage', {
      key: 'safer:session-boundary-signal',
      newValue: nonce,
    }));

    signal('shared-boundary-1');
    signal('shared-boundary-1');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    signal('shared-boundary-2');
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);

    unsubscribeFirst();
    signal('shared-boundary-3');
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(3);
    unsubscribeSecond();
  });

  it('makes cleanup idempotent', () => {
    const onInvalidated = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(onInvalidated);
    unsubscribe();
    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'safer:session-boundary-signal',
      newValue: 'after-cleanup',
    }));
    expect(onInvalidated).not.toHaveBeenCalled();
  });
});
