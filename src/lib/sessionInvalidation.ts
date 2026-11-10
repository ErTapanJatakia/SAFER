const CHANNEL_NAME = 'safer-session-boundary-v1';
const STORAGE_SIGNAL_KEY = 'safer:session-boundary-signal';

type SessionInvalidationMessage = {
  type: 'session-invalidated';
  nonce: string;
};

type InvalidationListener = (nonce: string) => void;

const listeners = new Set<InvalidationListener>();
let sharedChannel: BroadcastChannel | null = null;
let channelUnavailable = false;

function isValidNonce(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9-]{1,128}$/.test(value);
}

function createNonce(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getChannel(): BroadcastChannel | null {
  if (channelUnavailable || typeof BroadcastChannel === 'undefined') return null;
  if (sharedChannel) return sharedChannel;
  try {
    sharedChannel = new BroadcastChannel(CHANNEL_NAME);
    sharedChannel.addEventListener('message', (event: MessageEvent<SessionInvalidationMessage>) => {
      const message = event.data;
      if (message?.type !== 'session-invalidated' || !isValidNonce(message.nonce)) return;
      for (const listener of listeners) {
        try {
          listener(message.nonce);
        } catch {
          // One faulty consumer must not prevent other tabs' session boundaries.
        }
      }
    });
    return sharedChannel;
  } catch {
    channelUnavailable = true;
    return null;
  }
}

/**
 * Publishes a content-free session-boundary signal to other same-origin tabs.
 * No UID, organisation ID, role, or operational data is transmitted.
 */
export function publishSessionInvalidation(): void {
  const nonce = createNonce();
  try {
    getChannel()?.postMessage({ type: 'session-invalidated', nonce } satisfies SessionInvalidationMessage);
  } catch {
    // Fall through to the storage-event transport if BroadcastChannel is unavailable.
  }

  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_SIGNAL_KEY, nonce);
    window.localStorage.removeItem(STORAGE_SIGNAL_KEY);
  } catch {
    // BroadcastChannel remains the primary path when storage is unavailable.
  }
}

/** Subscribe to invalidations from other tabs; returns an idempotent cleanup. */
export function subscribeToSessionInvalidation(onInvalidated: () => void): () => void {
  const seenNonces = new Set<string>();
  const nonceOrder: string[] = [];
  const notify = (nonce: string) => {
    if (!isValidNonce(nonce) || seenNonces.has(nonce)) return;
    seenNonces.add(nonce);
    nonceOrder.push(nonce);
    // Bound memory while suppressing recent replay/dual-transport duplicates.
    if (nonceOrder.length > 256) {
      const expired = nonceOrder.shift();
      if (expired) seenNonces.delete(expired);
    }
    try {
      onInvalidated();
    } catch {
      // A failing consumer must not interrupt other subscribers or event delivery.
    }
  };
  const listener: InvalidationListener = notify;
  listeners.add(listener);
  getChannel();

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_SIGNAL_KEY && event.newValue) notify(event.newValue);
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}
