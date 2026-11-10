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

  it('suppresses non-consecutive replayed nonces across transport events', () => {
    const onInvalidated = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(onInvalidated);
    const signal = (nonce: string) => window.dispatchEvent(new StorageEvent('storage', {
      key: 'safer:session-boundary-signal',
      newValue: nonce,
    }));

    signal('boundary-a');
    signal('boundary-b');
    signal('boundary-a');

    expect(onInvalidated).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('rejects malformed or oversized invalidation values', () => {
    const onInvalidated = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(onInvalidated);
    const signal = (nonce: string) => window.dispatchEvent(new StorageEvent('storage', {
      key: 'safer:session-boundary-signal',
      newValue: nonce,
    }));

    signal('');
    signal('contains spaces');
    signal('x'.repeat(129));
    signal('valid-boundary-1');

    expect(onInvalidated).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('isolates a failing subscriber from other subscribers', () => {
    const failing = vi.fn(() => { throw new Error('consumer failure'); });
    const healthy = vi.fn();
    const unsubscribeFailing = subscribeToSessionInvalidation(failing);
    const unsubscribeHealthy = subscribeToSessionInvalidation(healthy);

    expect(() => window.dispatchEvent(new StorageEvent('storage', {
      key: 'safer:session-boundary-signal',
      newValue: 'fault-isolation-boundary',
    }))).not.toThrow();
    expect(failing).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledTimes(1);

    unsubscribeFailing();
    unsubscribeHealthy();
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

describe('BroadcastChannel session invalidation transport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('publishes opaque signals and accepts valid messages from another tab', async () => {
    class FakeBroadcastChannel extends EventTarget {
      static instances: FakeBroadcastChannel[] = [];
      postMessage = vi.fn();
      constructor(public readonly name: string) {
        super();
        FakeBroadcastChannel.instances.push(this);
      }
    }

    vi.resetModules();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    const module = await import('./sessionInvalidation.ts');
    const onInvalidated = vi.fn();
    const unsubscribe = module.subscribeToSessionInvalidation(onInvalidated);
    const channel = FakeBroadcastChannel.instances[0];

    expect(channel.name).toBe('safer-session-boundary-v1');
    module.publishSessionInvalidation();
    expect(channel.postMessage).toHaveBeenCalledTimes(1);
    const published = channel.postMessage.mock.calls[0][0] as { type: string; nonce: string };
    expect(published.type).toBe('session-invalidated');
    expect(published.nonce).toMatch(/^[A-Za-z0-9-]{1,128}$/);
    expect(Object.keys(published).sort()).toEqual(['nonce', 'type']);

    channel.dispatchEvent(new MessageEvent('message', {
      data: { type: 'session-invalidated', nonce: 'remote-broadcast-boundary' },
    }));
    channel.dispatchEvent(new MessageEvent('message', {
      data: { type: 'unrelated', nonce: 'ignored-boundary' },
    }));
    channel.dispatchEvent(new MessageEvent('message', {
      data: { type: 'session-invalidated', nonce: 'contains spaces' },
    }));

    expect(onInvalidated).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('isolates BroadcastChannel subscriber failures', async () => {
    class FakeBroadcastChannel extends EventTarget {
      static instances: FakeBroadcastChannel[] = [];
      postMessage = vi.fn();
      constructor() {
        super();
        FakeBroadcastChannel.instances.push(this);
      }
    }

    vi.resetModules();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    const module = await import('./sessionInvalidation.ts');
    const failing = vi.fn(() => { throw new Error('consumer failure'); });
    const healthy = vi.fn();
    const unsubscribeFailing = module.subscribeToSessionInvalidation(failing);
    const unsubscribeHealthy = module.subscribeToSessionInvalidation(healthy);

    expect(() => FakeBroadcastChannel.instances[0].dispatchEvent(new MessageEvent('message', {
      data: { type: 'session-invalidated', nonce: 'broadcast-fault-isolation' },
    }))).not.toThrow();
    expect(failing).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledTimes(1);

    unsubscribeFailing();
    unsubscribeHealthy();
  });

  it('closes the shared channel after the final subscriber and recreates it for a later subscriber', async () => {
    class ManagedBroadcastChannel extends EventTarget {
      static instances: ManagedBroadcastChannel[] = [];
      postMessage = vi.fn();
      close = vi.fn();
      constructor() {
        super();
        ManagedBroadcastChannel.instances.push(this);
      }
    }

    vi.resetModules();
    vi.stubGlobal('BroadcastChannel', ManagedBroadcastChannel);
    const module = await import('./sessionInvalidation.ts');
    const firstCleanup = module.subscribeToSessionInvalidation(vi.fn());
    const secondCleanup = module.subscribeToSessionInvalidation(vi.fn());
    const firstChannel = ManagedBroadcastChannel.instances[0];

    firstCleanup();
    expect(firstChannel.close).not.toHaveBeenCalled();
    secondCleanup();
    secondCleanup();
    expect(firstChannel.close).toHaveBeenCalledTimes(1);

    const laterCleanup = module.subscribeToSessionInvalidation(vi.fn());
    expect(ManagedBroadcastChannel.instances).toHaveLength(2);
    expect(ManagedBroadcastChannel.instances[1]).not.toBe(firstChannel);
    laterCleanup();
    expect(ManagedBroadcastChannel.instances[1].close).toHaveBeenCalledTimes(1);
  });

});


describe('session invalidation transport degradation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('uses the storage transport when BroadcastChannel is unavailable', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
    vi.resetModules();
    vi.stubGlobal('BroadcastChannel', undefined);
    try {
      const module = await import('./sessionInvalidation.ts');
      module.publishSessionInvalidation();
      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledWith(
        'safer:session-boundary-signal',
        expect.stringMatching(/^[A-Za-z0-9-]{1,128}$/),
      );
      expect(storage.removeItem).toHaveBeenCalledWith('safer:session-boundary-signal');
    } finally {
      if (originalDescriptor) Object.defineProperty(window, 'localStorage', originalDescriptor);
      else Reflect.deleteProperty(window, 'localStorage');
    }
  });

  it('falls back to storage when BroadcastChannel publishing throws', async () => {
    class FailingBroadcastChannel extends EventTarget {
      postMessage = vi.fn(() => { throw new Error('channel unavailable'); });
      constructor() { super(); }
    }
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
    vi.resetModules();
    vi.stubGlobal('BroadcastChannel', FailingBroadcastChannel);
    try {
      const module = await import('./sessionInvalidation.ts');
      module.publishSessionInvalidation();
      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(storage.removeItem).toHaveBeenCalledTimes(1);
    } finally {
      if (originalDescriptor) Object.defineProperty(window, 'localStorage', originalDescriptor);
      else Reflect.deleteProperty(window, 'localStorage');
    }
  });

  it('keeps BroadcastChannel publishing operational when storage is unavailable', async () => {
    class FakeBroadcastChannel extends EventTarget {
      static instances: FakeBroadcastChannel[] = [];
      postMessage = vi.fn();
      constructor() {
        super();
        FakeBroadcastChannel.instances.push(this);
      }
    }
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('storage blocked'); },
    });
    vi.resetModules();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    try {
      const module = await import('./sessionInvalidation.ts');
      module.publishSessionInvalidation();
      expect(FakeBroadcastChannel.instances[0].postMessage).toHaveBeenCalledTimes(1);
    } finally {
      if (originalDescriptor) Object.defineProperty(window, 'localStorage', originalDescriptor);
      else Reflect.deleteProperty(window, 'localStorage');
    }
  });
});
