import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishSessionInvalidation, subscribeToSessionInvalidation } from './sessionInvalidation.ts';

describe('cross-tab session invalidation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes only an opaque, transient storage signal', () => {
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    const removeItem = vi.spyOn(window.localStorage, 'removeItem');
    publishSessionInvalidation();

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem.mock.calls[0][0]).toBe('safer:session-boundary-signal');
    expect(setItem.mock.calls[0][1]).toBeTruthy();
    expect(setItem.mock.calls[0][1]).not.toMatch(/user|org|role|personnel|incident/i);
    expect(removeItem).toHaveBeenCalledWith('safer:session-boundary-signal');
    expect(window.localStorage.getItem('safer:session-boundary-signal')).toBeNull();
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
