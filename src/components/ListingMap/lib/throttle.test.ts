import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rafThrottle } from './throttle';

describe('rafThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) =>
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('collapses a burst of calls into one invocation', () => {
    const spy = vi.fn();
    const throttled = rafThrottle(spy);
    throttled();
    throttled();
    throttled();
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('invokes with the most recent arguments', () => {
    const spy = vi.fn();
    const throttled = rafThrottle(spy);
    throttled(1);
    throttled(2);
    vi.advanceTimersByTime(20);
    expect(spy).toHaveBeenCalledWith(2);
  });

  it('allows a new invocation after the frame fires', () => {
    const spy = vi.fn();
    const throttled = rafThrottle(spy);
    throttled();
    vi.advanceTimersByTime(20);
    throttled();
    vi.advanceTimersByTime(20);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('cancel prevents a pending invocation', () => {
    const spy = vi.fn();
    const throttled = rafThrottle(spy);
    throttled();
    throttled.cancel();
    vi.advanceTimersByTime(20);
    expect(spy).not.toHaveBeenCalled();
  });
});
