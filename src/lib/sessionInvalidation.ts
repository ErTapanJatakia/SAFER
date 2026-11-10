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
      if (message?.type !== 'session-invalidated' || typeof message.nonce !== 'string') return;
      for (const listener of listeners) listener(message.nonce);
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
  getChannel()?.postMessage({ type: 'session-invalidated', nonce } satisfies SessionInvalidationMessage);

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
  let lastNonce = '';
  const notify = (nonce: string) => {
    if (!nonce || nonce === lastNonce) return;
    lastNonce = nonce;
    onInvalidated();
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
