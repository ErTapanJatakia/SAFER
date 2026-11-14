import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useModalFocus} from '../hooks/useModalFocus.ts';

const TIMEOUT_OPTIONS = [5, 10, 15, 30] as const;
type TimeoutMinutes = typeof TIMEOUT_OPTIONS[number];
const DEFAULT_TIMEOUT: TimeoutMinutes = 15;
const WARNING_MS = 2 * 60 * 1000;
const SETTINGS_KEY = 'safer_session_timeout_minutes_v1';
const ACTIVITY_KEY = 'safer_session_last_activity_v1';

function readTimeout(): TimeoutMinutes {
  try {
    const value = Number(window.localStorage.getItem(SETTINGS_KEY));
    return TIMEOUT_OPTIONS.includes(value as TimeoutMinutes) ? value as TimeoutMinutes : DEFAULT_TIMEOUT;
  } catch {
    return DEFAULT_TIMEOUT;
  }
}

function persistTimeout(value: TimeoutMinutes): void {
  try { window.localStorage.setItem(SETTINGS_KEY, String(value)); } catch {
    // Browser storage is optional; the in-memory setting remains effective in this tab.
  }
}


interface SessionInactivityGuardProps {
  sessionKey: string;
  onExpire: () => void;
  children: React.ReactNode;
}

/**
 * Browser-side inactivity control. It never grants authority: expiry delegates
 * to AuthGate, which tears down the Firebase/Demo Guest session and membership.
 */
export const SessionInactivityGuard: React.FC<SessionInactivityGuardProps> = ({
  sessionKey, onExpire, children,
}) => {
  const [timeoutMinutes, setTimeoutMinutes] = useState<TimeoutMinutes>(readTimeout);
  const [remainingMs, setRemainingMs] = useState(timeoutMinutes * 60_000);
  const [expired, setExpired] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const onExpireRef = useRef(onExpire);
  const lastBroadcastRef = useRef(0);
  const expiredRef = useRef(false);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  const recordActivity = useCallback((broadcast = true) => {
    if (expiredRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    setRemainingMs(timeoutMinutes * 60_000);
    if (!broadcast || now - lastBroadcastRef.current < 5000) return;
    lastBroadcastRef.current = now;
    try { window.localStorage.setItem(ACTIVITY_KEY, String(now)); } catch {
      // Activity remains tracked in memory if storage is unavailable.
    }
  }, [timeoutMinutes]);

  useEffect(() => {
    // Each newly established page session starts its own inactivity window;
    // an old timestamp from a prior browser session cannot immediately expire it.
    recordActivity(true);
    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    const onActivity = () => recordActivity(true);
    activityEvents.forEach((eventName) => window.addEventListener(eventName, onActivity, {passive: true}));
    const onStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_KEY && event.newValue) {
        const remoteTimeout = Number(event.newValue);
        if (TIMEOUT_OPTIONS.includes(remoteTimeout as TimeoutMinutes)) {
          setTimeoutMinutes(remoteTimeout as TimeoutMinutes);
        }
        return;
      }
      if (event.key !== ACTIVITY_KEY || !event.newValue) return;
      const remoteTime = Number(event.newValue);
      if (!Number.isSafeInteger(remoteTime) || remoteTime <= 0 || remoteTime > Date.now()) return;
      if (remoteTime > lastActivityRef.current) {
        lastActivityRef.current = remoteTime;
        setRemainingMs(Math.max(0, timeoutMinutes * 60_000 - (Date.now() - remoteTime)));
      }
    };
    window.addEventListener('storage', onStorage);
    const check = () => {
      if (document.visibilityState === 'hidden' && Date.now() - lastActivityRef.current >= timeoutMinutes * 60_000) {
        expire();
        return;
      }
      const remaining = Math.max(0, timeoutMinutes * 60_000 - (Date.now() - lastActivityRef.current));
      setRemainingMs(remaining);
      if (remaining <= 0) expire();
    };
    const interval = window.setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onActivity));
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(interval);
    };
    // The session key intentionally resets the inactivity window on identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, timeoutMinutes, recordActivity]);

  function expire() {
    if (expiredRef.current) return;
    expiredRef.current = true;
    setExpired(true);
    onExpireRef.current();
  }

  const changeTimeout = (value: string) => {
    const next = Number(value);
    if (!TIMEOUT_OPTIONS.includes(next as TimeoutMinutes)) return;
    const normalized = next as TimeoutMinutes;
    persistTimeout(normalized);
    setTimeoutMinutes(normalized);
    recordActivity(true);
  };

  const minutes = Math.ceil(remainingMs / 60_000);
  const warning = !expired && remainingMs <= WARNING_MS;
  const warningModalRef = useModalFocus<HTMLElement>(warning, () => recordActivity(true));

  return (
    <>
      <div className="relative z-40 flex flex-wrap items-center justify-end gap-2 border-b border-slate-800 bg-slate-900 px-4 py-1.5 text-[11px] text-slate-300">
        <label className="flex items-center gap-2">
          <span>Auto sign-out</span>
          <select aria-label="Inactivity timeout" value={timeoutMinutes} onChange={(event) => changeTimeout(event.target.value)}
            className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white">
            {TIMEOUT_OPTIONS.map((option) => <option key={option} value={option}>{option} minutes</option>)}
          </select>
        </label>
        <span aria-live="off">Locks after inactivity · {minutes} min remaining</span>
      </div>
      {warning && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="session-timeout-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4">
          <section ref={warningModalRef} tabIndex={-1} className="w-full max-w-md rounded-xl border border-amber-500 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <h2 id="session-timeout-title" className="text-lg font-semibold">Your session is about to expire</h2>
            <p className="mt-2 text-sm text-slate-300">For your security, SAFER will sign you out after inactivity. Your session expires in approximately {minutes} minute{minutes === 1 ? '' : 's'}.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => {recordActivity(true);}}
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
    </>
  );
};
