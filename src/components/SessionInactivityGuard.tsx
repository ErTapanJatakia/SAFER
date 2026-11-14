import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useModalFocus} from '../hooks/useModalFocus.ts';

export const DEFAULT_SESSION_TIMEOUT_MINUTES = 10;
export const MIN_SESSION_TIMEOUT_MINUTES = 5;
export const MAX_SESSION_TIMEOUT_MINUTES = 60;
const WARNING_MS = 2 * 60 * 1000;
const SETTINGS_KEY_PREFIX = 'safer_session_timeout_minutes_v2_';
const ACTIVITY_KEY_PREFIX = 'safer_session_last_activity_v2_';

interface SessionTimeoutContextValue {
  timeoutMinutes: number;
  setTimeoutMinutes: (value: number) => void;
}
const SessionTimeoutContext = createContext<SessionTimeoutContextValue | null>(null);

export function useSessionTimeoutPreference(): SessionTimeoutContextValue {
  const value = useContext(SessionTimeoutContext);
  if (!value) throw new Error('Session timeout preference must be used inside an active SAFER session');
  return value;
}

export function useOptionalSessionTimeoutPreference(): SessionTimeoutContextValue | null {
  return useContext(SessionTimeoutContext);
}

function sessionScope(sessionKey: string): string {
  // An opaque local-storage namespace only; never used as an identity or security check.
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < sessionKey.length; index += 1) {
    const code = sessionKey.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}

function isSupportedTimeout(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_SESSION_TIMEOUT_MINUTES && value <= MAX_SESSION_TIMEOUT_MINUTES;
}

function readTimeout(storageKey: string): number {
  try {
    const value = Number(window.localStorage.getItem(storageKey));
    return isSupportedTimeout(value) ? value : DEFAULT_SESSION_TIMEOUT_MINUTES;
  } catch {
    return DEFAULT_SESSION_TIMEOUT_MINUTES;
  }
}

interface SessionInactivityGuardProps {
  sessionKey: string;
  onExpire: () => void;
  children: React.ReactNode;
}

/** Browser-side inactivity control; expiry delegates to AuthGate's existing sign-out path. */
export const SessionInactivityGuard: React.FC<SessionInactivityGuardProps> = ({
  sessionKey, onExpire, children,
}) => {
  const scope = sessionScope(sessionKey);
  const storageKey = `${SETTINGS_KEY_PREFIX}${scope}`;
  const activityKey = `${ACTIVITY_KEY_PREFIX}${scope}`;
  const [timeoutMinutes, setTimeoutMinutesState] = useState<number>(() => readTimeout(storageKey));
  const [remainingMs, setRemainingMs] = useState(timeoutMinutes * 60_000);
  const [expired, setExpired] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const onExpireRef = useRef(onExpire);
  const lastBroadcastRef = useRef(0);
  const expiredRef = useRef(false);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    setTimeoutMinutesState(readTimeout(storageKey));
    lastActivityRef.current = Date.now();
    expiredRef.current = false;
    setExpired(false);
  }, [sessionKey, storageKey]);

  const recordActivity = useCallback((broadcast = true) => {
    if (expiredRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    setRemainingMs(timeoutMinutes * 60_000);
    if (!broadcast || now - lastBroadcastRef.current < 5000) return;
    lastBroadcastRef.current = now;
    try { window.localStorage.setItem(activityKey, String(now)); } catch {
      // Activity remains tracked in memory if browser storage is unavailable.
    }
  }, [activityKey, timeoutMinutes]);

  const updateTimeout = useCallback((next: number) => {
    if (!isSupportedTimeout(next)) return;
    setTimeoutMinutesState(next);
    try { window.localStorage.setItem(storageKey, String(next)); } catch {
      // The in-memory preference remains active if browser storage is unavailable.
    }
    recordActivity(true);
  }, [recordActivity, storageKey]);

  const contextValue = useMemo(() => ({
    timeoutMinutes,
    setTimeoutMinutes: updateTimeout,
  }), [timeoutMinutes, updateTimeout]);

  function expire() {
    if (expiredRef.current) return;
    expiredRef.current = true;
    setExpired(true);
    onExpireRef.current();
  }

  useEffect(() => {
    recordActivity(true);
    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    const onActivity = () => recordActivity(true);
    activityEvents.forEach((eventName) => document.addEventListener(eventName, onActivity, {passive: true, capture: true}));
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        const remoteTimeout = Number(event.newValue);
        if (isSupportedTimeout(remoteTimeout)) setTimeoutMinutesState(remoteTimeout);
        return;
      }
      if (event.key !== activityKey || !event.newValue) return;
      const remoteTime = Number(event.newValue);
      if (!Number.isSafeInteger(remoteTime) || remoteTime <= 0 || remoteTime > Date.now()) return;
      if (remoteTime > lastActivityRef.current) {
        lastActivityRef.current = remoteTime;
        setRemainingMs(Math.max(0, timeoutMinutes * 60_000 - (Date.now() - remoteTime)));
      }
    };
    window.addEventListener('storage', onStorage);
    const check = () => {
      const remaining = Math.max(0, timeoutMinutes * 60_000 - (Date.now() - lastActivityRef.current));
      setRemainingMs(remaining);
      if (remaining <= 0) expire();
    };
    const interval = window.setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    return () => {
      activityEvents.forEach((eventName) => document.removeEventListener(eventName, onActivity, true));
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(interval);
    };
    // Session identity and timeout define this guard's lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, timeoutMinutes, recordActivity, storageKey, activityKey]);

  const minutes = Math.ceil(remainingMs / 60_000);
  const warning = !expired && remainingMs <= WARNING_MS;
  const warningModalRef = useModalFocus<HTMLElement>(warning, () => recordActivity(true));

  return (
    <SessionTimeoutContext.Provider value={contextValue}>
      <div className="relative z-40 flex flex-wrap items-center justify-end gap-2 border-b border-slate-800 bg-slate-900 px-4 py-1.5 text-[11px] text-slate-300">
        <span>Automatic sign-out · {minutes} min remaining</span>
      </div>
      {warning && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="session-timeout-title" aria-describedby="session-timeout-description"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4">
          <section ref={warningModalRef} tabIndex={-1} className="w-full max-w-md rounded-xl border border-amber-500 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <h2 id="session-timeout-title" className="text-lg font-semibold">Your session is about to expire</h2>
            <p id="session-timeout-description" className="mt-2 text-sm text-slate-300">For your security, SAFER will sign you out after inactivity. Your session expires in approximately {minutes} minute{minutes === 1 ? '' : 's'}.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => recordActivity(true)}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">Continue session</button>
              <button type="button" onClick={expire}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Sign out now</button>
            </div>
          </section>
        </div>
      )}
      {expired && (
        <div role="alert" className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950 p-6 text-center text-white">
          <div><h2 className="text-lg font-semibold">Session expired</h2><p className="mt-2 text-sm text-slate-300">SAFER is ending this session. Sign in again to continue.</p><button type="button" onClick={() => onExpireRef.current()} className="mt-4 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Retry sign out</button></div>
        </div>
      )}
      {children}
    </SessionTimeoutContext.Provider>
  );
};
