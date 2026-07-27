import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LAYER_CLUSTERS, LAYER_PINS_ACTIVE, SOURCE_ID } from '../config/mapStyle';
import type { BBox } from '../types/map';

/**
 * Gate over sprite rasterization, so a test can hold the map inside the `await`
 * in its own `load` handler and act while it is parked there. That window is
 * real and is not narrow: it spans 69 SVG decodes.
 */
const spriteGate = vi.hoisted(() => {
  let release: () => void = () => {};
  let promise: Promise<void> = Promise.resolve();
  return {
    /** Make the next sprite load hang until `release` is called. */
    arm() {
      promise = new Promise<void>((resolve) => { release = resolve; });
    },
    release() { release(); },
    wait() { return promise; },
  };
});

vi.mock('./sprite/pinShapes', () => ({
  loadPinImages: () => spriteGate.wait(),
  PIN_SIZE: { width: 56, height: 72 },
}));

// donutShapes also exports the geometry the cluster layer builds itself from,
// so the mock has to carry it or buildClusterLayers computes NaN offsets.
vi.mock('./sprite/donutShapes', () => ({
  loadDonutImages: () => spriteGate.wait(),
  DONUT_STEPS: 10,
  HEAD_CENTER: { x: 48, y: 48 },
  DONUT_SIZE: { width: 96, height: 124 },
}));

/** Set per test to control what the source's cluster expansion does. */
let clusterZoom: () => Promise<number> = () => Promise.resolve(9);

/**
 * Enough of MapLibre's Map to exercise the engine's lifecycle.
 *
 * The important fidelity is `remove()`: the real Map tears its style down, so
 * every subsequent style mutation throws. Recording the attempt *before*
 * throwing is what lets a test tell "never tried" apart from "tried and threw".
 */
class FakeMap {
  handlers = new Map<string, Array<(event?: unknown) => void>>();
  removed = false;
  sources = new Set<string>();
  layers = new Map<string, { id: string }>();
  filters: Array<[string, unknown]> = [];
  addSourceCalls: string[] = [];
  addLayerCalls: string[] = [];

  private guard() {
    if (this.removed) throw new Error('Map is removed');
  }

  private key(event: string, layer?: string) {
    return layer === undefined ? event : `${event}:${layer}`;
  }

  on(event: string, a: unknown, b?: unknown) {
    const layer = typeof a === 'string' ? a : undefined;
    const handler = (typeof a === 'function' ? a : b) as (e?: unknown) => void;
    const key = this.key(event, layer);
    this.handlers.set(key, [...(this.handlers.get(key) ?? []), handler]);
  }

  off(event: string, a: unknown, b?: unknown) {
    const layer = typeof a === 'string' ? a : undefined;
    const handler = typeof a === 'function' ? a : b;
    const key = this.key(event, layer);
    this.handlers.set(
      key,
      (this.handlers.get(key) ?? []).filter((entry) => entry !== handler),
    );
  }

  fire(event: string, payload?: unknown, layer?: string) {
    for (const handler of this.handlers.get(this.key(event, layer)) ?? []) {
      handler(payload);
    }
  }

  getStyle() {
    return { layers: [{ id: 'poi-label' }, { id: 'water' }, { id: 'road' }] };
  }

  setLayoutProperty() { this.guard(); }

  addSource(id: string) {
    this.addSourceCalls.push(id);
    this.guard();
    this.sources.add(id);
  }

  getSource(id: string) {
    if (!this.sources.has(id)) return undefined;
    return {
      setData: () => this.guard(),
      getClusterExpansionZoom: () => clusterZoom(),
    };
  }

  addLayer(layer: { id: string }) {
    this.addLayerCalls.push(layer.id);
    this.guard();
    this.layers.set(layer.id, layer);
  }

  getLayer(id: string) { return this.layers.get(id); }

  setFilter(id: string, filter: unknown) {
    this.guard();
    this.filters.push([id, filter]);
  }

  getCanvas() { return { width: 800, height: 600, style: {} as { cursor?: string } }; }

  getBounds() {
    return {
      getWest: () => 25, getSouth: () => 35, getEast: () => 45, getNorth: () => 43,
    };
  }

  project() { return { x: 10, y: 20 }; }
  fitBounds() { this.guard(); }
  flyTo() { this.guard(); }
  easeTo() { this.guard(); }
  zoomIn() { this.guard(); }
  zoomOut() { this.guard(); }
  remove() { this.removed = true; }
}

let lastMap: FakeMap;

vi.mock('maplibre-gl', () => ({
  Map: class extends FakeMap {
    constructor() {
      super();
      // Handing the instance to the test is the whole point of the subclass:
      // the engine never returns its map, so this is the only way to reach it.
      // oxlint-disable-next-line typescript/no-this-alias
      lastMap = this;
    }
  },
}));

const { createMapEngine } = await import('./createMapEngine');

const TURKEY: BBox = [25.5, 35.8, 44.9, 42.3];

const build = () =>
  createMapEngine(document.createElement('div'), {
    styleUrl: 'https://example.test/style.json',
    initialBounds: TURKEY,
    onError: vi.fn(),
    onRecover: vi.fn(),
  });

/** Let every already-resolved microtask in the load handler run out. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** The most recent filter pushed onto a given layer, if any. */
const lastFilterOn = (layer: string) =>
  lastMap.filters.filter(([id]) => id === layer).pop()?.[1];

describe('createMapEngine', () => {
  beforeEach(() => {
    clusterZoom = () => Promise.resolve(9);
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    spriteGate.release();
  });

  it('registers the source and both layer families once the style is up', async () => {
    const engine = build();
    lastMap.fire('load');
    await flush();

    expect(lastMap.sources.has(SOURCE_ID)).toBe(true);
    expect(lastMap.addLayerCalls).toContain(LAYER_CLUSTERS);
    expect(lastMap.addLayerCalls).toContain(LAYER_PINS_ACTIVE);
    engine.destroy();
  });

  /**
   * The `load` handler awaits 69 sprite rasterizations before it registers
   * anything. React StrictMode unmounts and remounts every effect, so an
   * unmount lands inside that await on every single mount in development —
   * and the handler then resumed against a map whose style was gone, throwing
   * out of an async event handler where nothing could catch it.
   */
  it('does not touch a map that was destroyed while its sprites loaded', async () => {
    spriteGate.arm();
    const engine = build();
    lastMap.fire('load');

    engine.destroy();
    spriteGate.release();
    await flush();

    expect(lastMap.removed).toBe(true);
    expect(lastMap.addSourceCalls).toEqual([]);
    expect(lastMap.addLayerCalls).toEqual([]);
  });

  it('still registers normally when nothing interrupts the load', async () => {
    spriteGate.arm();
    const engine = build();
    lastMap.fire('load');
    spriteGate.release();
    await flush();

    expect(lastMap.addSourceCalls).toEqual([SOURCE_ID]);
    engine.destroy();
  });

  /**
   * `setSelected` before the layers exist can only record the id — there is
   * nothing to filter yet. Becoming ready has to re-apply it, or a card
   * clicked while the basemap was still coming up highlighted nothing, for as
   * long as that selection lasted.
   */
  describe('a highlight requested before the map is ready', () => {
    it('is applied once the layers exist', async () => {
      spriteGate.arm();
      const engine = build();
      engine.setSelected(7);

      lastMap.fire('load');
      spriteGate.release();
      await flush();

      expect(lastFilterOn(LAYER_PINS_ACTIVE)).toEqual(
        ['in', ['get', 'id'], ['literal', [7]]],
      );
      engine.destroy();
    });

    it('carries the hovered id through as well', async () => {
      spriteGate.arm();
      const engine = build();
      engine.setHovered(3);

      lastMap.fire('load');
      spriteGate.release();
      await flush();

      expect(lastFilterOn(LAYER_PINS_ACTIVE)).toEqual(
        ['in', ['get', 'id'], ['literal', [3]]],
      );
      engine.destroy();
    });

    it('applies nothing when no highlight was requested', async () => {
      const engine = build();
      lastMap.fire('load');
      await flush();

      expect(lastFilterOn(LAYER_PINS_ACTIVE)).toEqual(
        ['in', ['get', 'id'], ['literal', []]],
      );
      engine.destroy();
    });
  });

  /**
   * `getClusterExpansionZoom` is asynchronous and can reject — the source is
   * gone, or the cluster id went stale when the data changed under it. An
   * uncaught rejection in a click handler is an unhandled promise rejection,
   * which is a hard failure under a strict host page.
   */
  describe('a cluster whose expansion zoom fails', () => {
    it('reports the failure instead of rejecting into nothing', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const engine = build();
      lastMap.fire('load');
      await flush();

      clusterZoom = () => Promise.reject(new Error('no such cluster'));
      const onCluster = vi.fn();
      engine.onClusterClick(onCluster);

      lastMap.fire(
        'click',
        { features: [{ properties: { cluster_id: 4 }, geometry: { coordinates: [32, 39] } }] },
        LAYER_CLUSTERS,
      );
      await flush();

      expect(onCluster).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
      engine.destroy();
    });

    it('expands and notifies when it succeeds', async () => {
      const engine = build();
      lastMap.fire('load');
      await flush();

      const onCluster = vi.fn();
      engine.onClusterClick(onCluster);

      lastMap.fire(
        'click',
        { features: [{ properties: { cluster_id: 4 }, geometry: { coordinates: [32, 39] } }] },
        LAYER_CLUSTERS,
      );
      await flush();

      expect(onCluster).toHaveBeenCalledWith(4, [32, 39]);
      engine.destroy();
    });
  });
});
