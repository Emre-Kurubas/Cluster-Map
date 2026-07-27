import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Gate over rasterization, so a test can park the pass with a batch in flight
 * and act while it is held there. Without it, "cancel it part-way through"
 * would be a race against the scheduler: the whole set finishes in a handful
 * of milliseconds under a stubbed decoder, so the assertion would be measuring
 * how fast the test runner happened to be.
 */
const gate = vi.hoisted(() => {
  let release: () => void = () => {};
  let held: Promise<void> | null = null;
  return {
    /** Make every rasterization from now on hang until `open` is called. */
    close() { held = new Promise<void>((resolve) => { release = resolve; }); },
    open() { release(); held = null; },
    wait() { return held ?? Promise.resolve(); },
    reset() { release(); held = null; },
  };
});

/**
 * jsdom has no image decoder, so the real rasterizer can only time out. What is
 * under test here is the schedule — what gets drawn, in what order, and what
 * happens when the map goes away mid-pass — not the pixels.
 */
vi.mock('./pinShapes', () => ({
  rasterizeSvg: vi.fn(async (svg: string) => {
    await gate.wait();
    return { svg } as unknown as ImageData;
  }),
}));
import { rasterizeSvg } from './pinShapes';
import { donutSpriteIds, donutSpriteId } from './donutShapes';
import { warmDonutSprites } from './warmDonuts';

const ALL = donutSpriteIds();

const fakeMap = () => {
  const images = new Map<string, unknown>();
  return {
    images,
    hasImage: (id: string) => images.has(id),
    addImage: (id: string, image: unknown) => { images.set(id, image); },
  };
};

/** Resolves once the pass has drawn exactly this many sprites. */
const settle = (map: ReturnType<typeof fakeMap>, expected: number) =>
  vi.waitFor(() => expect(map.images.size).toBe(expected));

/** Long enough for several more batches, had any been coming. */
const beat = () => new Promise((resolve) => { setTimeout(resolve, 20); });

/**
 * Every pass started by a test, so none of them outlive it.
 *
 * A pass that is still working when the next test begins goes on drawing into
 * the map it was given — harmless in itself — but it shares the rasterizer
 * mock, so its calls land in the next test's counts. That is exactly the kind
 * of leak that makes a suite fail somewhere other than where it broke.
 */
const running: Array<() => void> = [];
const start = (map: ReturnType<typeof fakeMap>) => {
  const cancel = warmDonutSprites(map as never);
  running.push(cancel);
  return cancel;
};

describe('warmDonutSprites', () => {
  beforeEach(() => { gate.reset(); vi.mocked(rasterizeSvg).mockClear(); });
  afterEach(() => {
    for (const cancel of running.splice(0)) cancel();
    gate.reset();
    vi.restoreAllMocks();
  });

  /**
   * The reason the whole thing exists. MapLibre holds a tile's symbol data
   * behind the missing-image resolver, so a mix first seen when a cluster
   * expands stalls the tile it lives in — and the map goes on drawing the
   * cluster that was clicked until that decode lands.
   */
  it('eventually draws every mix a cluster can have', async () => {
    const map = fakeMap();
    start(map);

    await settle(map, ALL.length);
    expect([...map.images.keys()].sort()).toEqual([...ALL].sort());
  });

  it('draws nothing before yielding, so the first paint is never behind it', () => {
    const map = fakeMap();
    start(map);

    expect(map.images.size).toBe(0);
    expect(rasterizeSvg).not.toHaveBeenCalled();
  });

  it('never starts when cancelled before its first slot', async () => {
    const map = fakeMap();
    start(map)();

    await beat();
    expect(rasterizeSvg).not.toHaveBeenCalled();
    expect(map.images.size).toBe(0);
  });

  /**
   * The map can be removed at any point in here — this pass outlives no single
   * frame — and drawing into a torn-down style would throw from a promise
   * nobody is holding.
   */
  it('lets the batch in flight finish and then stops', async () => {
    gate.close();
    const map = fakeMap();
    const cancel = start(map);

    // Park with the first batch requested but not decoded.
    await vi.waitFor(() => expect(rasterizeSvg).toHaveBeenCalled());
    cancel();
    const inFlight = vi.mocked(rasterizeSvg).mock.calls.length;

    gate.open();
    await beat();

    expect(map.images.size).toBe(inFlight);
    expect(map.images.size).toBeLessThan(ALL.length);
    expect(rasterizeSvg).toHaveBeenCalledTimes(inFlight);
  });

  /**
   * The resolver may have already drawn a mix on demand. `addImage` on an id
   * that exists does not throw — it fires an `error` on the style, which this
   * map reports to the user as a basemap failure.
   */
  it('leaves sprites the resolver already drew alone', async () => {
    const map = fakeMap();
    const existing = donutSpriteId(4, 4);
    map.images.set(existing, 'drawn on demand');

    start(map);
    await settle(map, ALL.length);

    expect(map.images.get(existing)).toBe('drawn on demand');
    expect(rasterizeSvg).toHaveBeenCalledTimes(ALL.length - 1);
  });

  it('carries on past a sprite that fails to draw', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(rasterizeSvg).mockImplementationOnce(
      () => Promise.reject(new Error('decode failed')),
    );

    const map = fakeMap();
    start(map);

    await settle(map, ALL.length - 1);
  });
});
