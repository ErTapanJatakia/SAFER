import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SessionInactivityGuard} from './SessionInactivityGuard';

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

  const renderGuard = async () => {
    await act(async () => {
      root.render(<SessionInactivityGuard sessionKey="user-a" onExpire={onExpire}><main>Protected session</main></SessionInactivityGuard>);
    });
  };

  const timeoutSelect = () => host.querySelector('select[aria-label="Inactivity timeout"]') as HTMLSelectElement;
  const changeTimeout = (value: string) => {
    const select = timeoutSelect();
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (!setter) throw new Error('HTMLSelectElement value setter unavailable');
    setter.call(select, value);
    select.dispatchEvent(new Event('change', {bubbles: true}));
  };

  it('defaults to a 15-minute timeout and offers only bounded timeout choices', async () => {
    await renderGuard();
    expect(timeoutSelect().value).toBe('15');
    expect([...timeoutSelect().options].map((option) => option.value)).toEqual(['5', '10', '15', '30']);
    expect(host.textContent).toContain('Protected session');
    expect(host.textContent).toContain('15 min remaining');
  });

  it('warns two minutes before expiry and allows the user to continue', async () => {
    await renderGuard();
    await act(async () => { await vi.advanceTimersByTimeAsync(13 * 60_000); });
    expect(host.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(host.textContent).toContain('Your session is about to expire');
    await act(async () => {
      (host.querySelector('button') as HTMLButtonElement).click();
    });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('keeps keyboard focus in the warning and treats Escape as continue', async () => {
    await renderGuard();
    await act(async () => { await vi.advanceTimersByTimeAsync(13 * 60_000); });
    const dialog = host.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog.contains(document.activeElement)).toBe(true);
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('expires the session when the configured inactivity period elapses', async () => {
    await renderGuard();
    await act(async () => {
      changeTimeout('5');
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Session expired');
  });

  it('resets the inactivity window on real user activity', async () => {
    await renderGuard();
    await act(async () => {
      timeoutSelect().value = '5';
      timeoutSelect().dispatchEvent(new Event('change', {bubbles: true}));
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    await act(async () => { window.dispatchEvent(new Event('pointerdown')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('accepts a newer activity timestamp from another same-origin tab', async () => {
    await renderGuard();
    await act(async () => {
      timeoutSelect().value = '5';
      timeoutSelect().dispatchEvent(new Event('change', {bubbles: true}));
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'safer_session_last_activity_v1',
        newValue: String(Date.now()),
      }));
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60_000); });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('normalizes tampered or unsupported stored timeout values to the secure default', async () => {
    window.localStorage.setItem('safer_session_timeout_minutes_v1', '0');
    await renderGuard();
    expect(timeoutSelect().value).toBe('15');
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('persists the selected timeout without storing identity or session credentials', async () => {
    await renderGuard();
    await act(async () => {
      changeTimeout('10');
    });
    expect(window.localStorage.getItem('safer_session_timeout_minutes_v1')).toBe('10');
    expect(window.localStorage.getItem('safer_session_timeout_minutes_v1')).not.toMatch(/uid|token|password|user-a/i);
  });
});
