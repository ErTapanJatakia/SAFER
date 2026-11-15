export const AUTH_FLOW_MARKER_KEY = 'safer:auth-flow:v1';
export const AUTH_FLOW_MARKER_TTL_MS = 5 * 60 * 1000;

type AuthFlowMarker = { startedAt: number };

function readMarker(storage: Storage): AuthFlowMarker | null {
  const raw = storage.getItem(AUTH_FLOW_MARKER_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'startedAt' in parsed
      && typeof parsed.startedAt === 'number'
      && Number.isFinite(parsed.startedAt)
    ) return { startedAt: parsed.startedAt };
  } catch {
    // A malformed marker is stale state, never an authentication signal.
  }
  return null;
}

/**
 * Removes only SAFER's short-lived Google auth-flow marker when malformed,
 * expired, or timestamped in the future. It never clears Firebase persistence,
 * cookies, preferences, operational data, or unrelated browser storage.
 */
export function cleanupStaleAuthFlowMarker(
  storage: Storage,
  now = Date.now(),
): boolean {
  try {
    const marker = readMarker(storage);
    if (!marker || marker.startedAt > now || now - marker.startedAt > AUTH_FLOW_MARKER_TTL_MS) {
      storage.removeItem(AUTH_FLOW_MARKER_KEY);
      return true;
    }
    return false;
  } catch {
    // Private browsing / hardened profiles may deny storage access.
    // Authentication must remain usable without this optional hygiene marker.
    return false;
  }
}

export function beginAuthFlow(storage: Storage, now = Date.now()): boolean {
  try {
    storage.setItem(AUTH_FLOW_MARKER_KEY, JSON.stringify({ startedAt: now } satisfies AuthFlowMarker));
    return true;
  } catch {
    return false;
  }
}

export function endAuthFlow(storage: Storage): void {
  try {
    storage.removeItem(AUTH_FLOW_MARKER_KEY);
  } catch {
    // Marker cleanup is best-effort and must not mask the Firebase result.
  }
}
