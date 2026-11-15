export type InactivityEventTarget = Pick<Window, 'addEventListener' | 'removeEventListener' | 'setTimeout' | 'clearTimeout'>;

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;

/** Starts an inactivity deadline and resets it on meaningful user activity. */
export function startSessionInactivityMonitor(
  target: InactivityEventTarget,
  timeoutMs: number,
  onTimeout: () => void,
): () => void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return () => undefined;
  let timer: number | undefined;
  let expired = false;
  const reset = () => {
    if (expired) return;
    if (timer !== undefined) target.clearTimeout(timer);
    timer = target.setTimeout(() => {
      expired = true;
      onTimeout();
    }, timeoutMs);
  };
  for (const eventName of ACTIVITY_EVENTS) target.addEventListener(eventName, reset, {passive: true});
  reset();
  return () => {
    expired = true;
    if (timer !== undefined) target.clearTimeout(timer);
    for (const eventName of ACTIVITY_EVENTS) target.removeEventListener(eventName, reset);
  };
}
