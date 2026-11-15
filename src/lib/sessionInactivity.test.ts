import {afterEach,describe,expect,it,vi} from 'vitest';
import {startSessionInactivityMonitor} from './sessionInactivity.ts';

afterEach(()=>vi.useRealTimers());
describe('session inactivity monitor',()=>{
  it('expires after the configured idle interval',()=>{
    vi.useFakeTimers();
    const onTimeout=vi.fn();
    const stop=startSessionInactivityMonitor(window,5000,onTimeout);
    vi.advanceTimersByTime(4999);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    stop();
  });
  it('resets the deadline after user activity',()=>{
    vi.useFakeTimers();
    const onTimeout=vi.fn();
    const stop=startSessionInactivityMonitor(window,5000,onTimeout);
    vi.advanceTimersByTime(4000);
    window.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(4000);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    stop();
  });
  it('cancels timers and listeners when stopped',()=>{
    vi.useFakeTimers();
    const onTimeout=vi.fn();
    const stop=startSessionInactivityMonitor(window,5000,onTimeout);
    stop();
    vi.advanceTimersByTime(10000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
  it('ignores invalid timeout values',()=>{
    vi.useFakeTimers();
    const onTimeout=vi.fn();
    const stop=startSessionInactivityMonitor(window,0,onTimeout);
    vi.advanceTimersByTime(10000);
    expect(onTimeout).not.toHaveBeenCalled();
    stop();
  });
});
