import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getSessionTimeoutPreferenceStorageKey, SessionInactivityGuard, useSessionTimeoutPreference} from './SessionInactivityGuard';

const PreferenceHarness = () => {
  const {timeoutMinutes, setTimeoutMinutes} = useSessionTimeoutPreference();
  return <label>Account inactivity timeout
    <input aria-label="Account inactivity timeout in minutes" type="number" min={5} max={60} value={timeoutMinutes}
      onChange={(event) => setTimeoutMinutes(Number(event.target.value))} />
  </label>;
};

describe('session inactivity guard', () => {
  let host: HTMLElement;
  let root: Root;
  let onExpire: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z'));
    window.localStorage.clear();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    onExpire = vi.fn();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    window.localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const renderGuard = async (sessionKey = 'user-a') => {
    await act(async () => {
      root.render(<SessionInactivityGuard sessionKey={sessionKey} onExpire={onExpire}><main>Protected session</main><PreferenceHarness /></SessionInactivityGuard>);
    });
  };

  const timeoutInput = () => host.querySelector('input[aria-label="Account inactivity timeout in minutes"]') as HTMLInputElement;
  const changeTimeout = async (value: number) => {
    await act(async () => {
      const input = timeoutInput();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (!setter) throw new Error('HTMLInputElement value setter unavailable');
      setter.call(input, String(value));
      input.dispatchEvent(new Event('input', {bubbles: true}));
    });
  };

  it('defaults to ten minutes and exposes the requested five-to-sixty-minute range', async () => {
    await renderGuard();
    expect(timeoutInput().value).toBe('10');
    expect(timeoutInput().min).toBe('5');
    expect(timeoutInput().max).toBe('60');
    expect(host.textContent).toContain('Protected session');
    expect(host.textContent).toContain('10 min remaining');
  });

  it('warns two minutes before expiry and allows the user to continue', async () => {
    await renderGuard();
    await act(async () => { await vi.advanceTimersByTimeAsync(8 * 60_000); });
    expect(host.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(host.textContent).toContain('Your session is about to expire');
    await act(async () => { (host.querySelector('button') as HTMLButtonElement).click(); });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('keeps keyboard focus in the warning and treats Escape as continue', async () => {
    await renderGuard();
    await act(async () => { await vi.advanceTimersByTimeAsync(8 * 60_000); });
    const dialog = host.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog.contains(document.activeElement)).toBe(true);
    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('expires the session when the configured inactivity period elapses', async () => {
    await renderGuard();
    await changeTimeout(5);
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Session expired');
  });

  it('accepts any whole-minute timeout from five through sixty', async () => {
    await renderGuard();
    await changeTimeout(60);
    expect(timeoutInput().value).toBe('60');
    await changeTimeout(5);
    expect(timeoutInput().value).toBe('5');
    await changeTimeout(4);
    expect(timeoutInput().value).toBe('5');
    await changeTimeout(61);
    expect(timeoutInput().value).toBe('5');
  });

  it('resets the inactivity window on real user activity', async () => {
    await renderGuard();
    await changeTimeout(5);
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    await act(async () => { document.dispatchEvent(new Event('pointerdown', {bubbles: true})); });
    expect(host.textContent).toContain('5 min remaining');
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('accepts a newer activity timestamp from another same-origin tab', async () => {
    await renderGuard();
    await changeTimeout(5);
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    await act(async () => {
      const storedKeys = Array.from({length: window.localStorage.length}, (_, index) => window.localStorage.key(index));
      const key = storedKeys.find((candidate) => candidate?.startsWith('safer_session_last_activity_v2_'));
      expect(key).toBeTruthy();
      window.dispatchEvent(new StorageEvent('storage', {key, newValue: String(Date.now())}));
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60_000); });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('keeps authenticated and Demo Guest timeout preferences separate on the same browser', async () => {
    await renderGuard('user-a');
    await changeTimeout(25);
    const authenticatedValue = timeoutInput().value;
    expect(authenticatedValue).toBe('25');
    await renderGuard('demo-guest');
    expect(timeoutInput().value).toBe('10');
    await renderGuard('user-a');
    expect(timeoutInput().value).toBe('25');
  });

  it('normalizes tampered or unsupported stored timeout values to the ten-minute default', async () => {
    window.localStorage.setItem(getSessionTimeoutPreferenceStorageKey('user-a'), '0');
    await renderGuard();
    expect(timeoutInput().value).toBe('10');
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('persists only a bounded numeric timeout preference, not identity or credentials', async () => {
    await renderGuard();
    await changeTimeout(12);
    const entries = Array.from({length: window.localStorage.length}, (_, index) => {
      const key = window.localStorage.key(index) ?? '';
      return [key, window.localStorage.getItem(key)] as const;
    });
    expect(entries.some(([key, value]) => key.startsWith('safer_session_timeout_minutes_v2_') && value === '12')).toBe(true);
    expect(JSON.stringify(entries)).not.toMatch(/user-a|demo-guest|token|password/i);
  });
});
