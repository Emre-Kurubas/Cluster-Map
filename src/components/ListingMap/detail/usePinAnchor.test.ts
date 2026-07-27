import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePinAnchor } from './usePinAnchor';
import type { LngLat, MapEngine } from '../types/map';

const SIZE = { width: 800, height: 600 };

/** Minimal engine: only the two members the hook touches are real. */
function fakeEngine(point: [number, number]) {
  let current = point;
  const listeners = new Set<() => void>();

  const engine = {
    project: vi.fn(() => current),
    onMove: vi.fn((cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }),
  } as unknown as MapEngine;

  return {
    engine,
    moveTo(next: [number, number]) {
      current = next;
      for (const cb of listeners) cb();
    },
    get listenerCount() { return listeners.size; },
  };
}

const ANKARA: LngLat = [32.8597, 39.9334];

/** Let the hook's rAF-throttled re-projection land. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });

describe('usePinAnchor', () => {
  it('projects once on mount', () => {
    const { engine } = fakeEngine([120, 240]);
    const { result } = renderHook(() => usePinAnchor(engine, ANKARA, SIZE));
    expect(result.current).toEqual({ x: 120, y: 240, onScreen: true });
  });

  it('returns null without an engine', () => {
    const { result } = renderHook(() => usePinAnchor(null, ANKARA, SIZE));
    expect(result.current).toBeNull();
  });

  it('returns null without a coordinate', () => {
    const { engine } = fakeEngine([0, 0]);
    const { result } = renderHook(() => usePinAnchor(engine, null, SIZE));
    expect(result.current).toBeNull();
  });

  it('re-projects when the map moves', async () => {
    const map = fakeEngine([120, 240]);
    const { result } = renderHook(() => usePinAnchor(map.engine, ANKARA, SIZE));

    map.moveTo([300, 100]);
    await settle();

    expect(result.current).toEqual({ x: 300, y: 100, onScreen: true });
  });

  it('reports onScreen false well outside the container', async () => {
    const map = fakeEngine([120, 240]);
    const { result } = renderHook(() => usePinAnchor(map.engine, ANKARA, SIZE));

    map.moveTo([-500, 240]);
    await settle();

    expect(result.current?.onScreen).toBe(false);
  });

  it('keeps onScreen true inside the 40px margin', async () => {
    const map = fakeEngine([120, 240]);
    const { result } = renderHook(() => usePinAnchor(map.engine, ANKARA, SIZE));

    map.moveTo([-20, 240]);
    await settle();

    expect(result.current?.onScreen).toBe(true);
  });

  it('unsubscribes on unmount', () => {
    const map = fakeEngine([0, 0]);
    const { unmount } = renderHook(() => usePinAnchor(map.engine, ANKARA, SIZE));
    expect(map.listenerCount).toBe(1);
    unmount();
    expect(map.listenerCount).toBe(0);
  });
});
