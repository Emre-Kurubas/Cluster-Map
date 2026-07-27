import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
// The stylesheet MapLibre actually ships, read verbatim: the collision this
// guards against only exists in the real file.
import maplibreCss from 'maplibre-gl/dist/maplibre-gl.css?raw';
import { MapCanvas } from './MapCanvas';
import { createListingStore } from '../store/createListingStore';
import type { ListingStore } from '../store/createListingStore';
import { renderWithStore } from '../test/renderWithStore';

/** What the component subscribed to, so the tests can fire those callbacks. */
const engineSpy = {
  hover: null as ((id: number | null) => void) | null,
  unsubscribed: 0,
};

// The real engine needs WebGL. Only the container element and the wiring
// around it are under test here.
vi.mock('./createMapEngine', () => ({
  createMapEngine: () => {
    const noop = () => {};
    const unsubscribe = () => noop;
    return {
      setData: noop, flyToBounds: noop, flyToPoint: noop,
      queryVisibleIds: () => [], setHovered: noop, setSelected: noop,
      zoomIn: noop, zoomOut: noop, resetView: noop,
      onIdle: unsubscribe, onFeatureClick: unsubscribe,
      onFeatureHover: (callback: (id: number | null) => void) => {
        engineSpy.hover = callback;
        return () => { engineSpy.unsubscribed += 1; };
      },
      onClusterClick: unsubscribe,
      destroy: noop,
    };
  },
}));

// A fresh store per test, so nothing needs resetting and no test can leak into
// the next by forgetting to.
let store: ListingStore = createListingStore();

const renderCanvas = () =>
  renderWithStore(
    <MapCanvas
      listings={[]}
      styleUrl="https://example.test/style.json"
      onEngineReady={() => {}}
      onError={() => {}}
      onRecover={() => {}}
    />,
    { store },
  );

/**
 * Hovering a pin on the map has to reach the same store field a hovered rail
 * card writes to — that field is what swaps the enlarged-pin layer's filter,
 * so without this the highlight only ever worked from the list side.
 */
describe('pin hover', () => {
  beforeEach(() => {
    store = createListingStore();
    engineSpy.hover = null;
    engineSpy.unsubscribed = 0;
  });

  it('subscribes to the engine', () => {
    renderCanvas();
    expect(engineSpy.hover).toBeTypeOf('function');
  });

  it('puts the hovered pin into the store', () => {
    renderCanvas();
    act(() => engineSpy.hover?.(7));
    expect(store.getState().hoveredId).toBe(7);
  });

  it('clears it again when the pointer leaves', () => {
    renderCanvas();
    act(() => engineSpy.hover?.(7));
    act(() => engineSpy.hover?.(null));
    expect(store.getState().hoveredId).toBeNull();
  });

  it('unsubscribes and drops the hover on unmount', () => {
    const { unmount } = renderCanvas();
    act(() => engineSpy.hover?.(7));
    unmount();
    expect(engineSpy.unsubscribed).toBe(1);
    // A stale id would keep a phantom card highlighted in the rail.
    expect(store.getState().hoveredId).toBeNull();
  });
});

/** Every CSS property MapLibre's own stylesheet declares on `.maplibregl-map`. */
function maplibreContainerProperties(): Set<string> {
  const properties = new Set<string>();

  for (const [, selectors, body] of maplibreCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const matchesBareContainer = selectors
      .split(',')
      .some((selector: string) => selector.trim() === '.maplibregl-map');
    if (!matchesBareContainer) continue;

    for (const declaration of body.split(';')) {
      const property = declaration.split(':')[0]?.trim();
      if (property) properties.add(property);
    }
  }
  return properties;
}

/**
 * Which CSS properties each utility we put on the container sets.
 *
 * Every class on the container must appear here, so adding one forces a
 * decision about whether MapLibre already owns that property.
 */
const UTILITY_PROPERTIES: Record<string, string[]> = {
  absolute: ['position'],
  relative: ['position'],
  fixed: ['position'],
  static: ['position'],
  sticky: ['position'],
  'inset-0': ['top', 'right', 'bottom', 'left'],
  'h-full': ['height'],
  'w-full': ['width'],
};

/**
 * MapLibre stamps `.maplibregl-map` onto the container we hand it, and
 * `maplibre-gl.css` arrives unlayered while Tailwind v4 emits utilities inside
 * `@layer utilities`. Unlayered rules beat layered ones no matter the import
 * order, so MapLibre wins every property it declares — including `position`.
 *
 * That is how `absolute inset-0` silently became `position: relative` with
 * inert offsets: the container collapsed to 0px tall, the map never appeared,
 * and `queryRenderedFeatures` on a zero-height viewport returned nothing, so
 * the results rail reported "0 ilan" for every listing.
 */
describe('map container sizing', () => {
  const { container } = renderCanvas();
  const element = container.firstElementChild as HTMLElement;
  const classes = element.className.split(/\s+/).filter(Boolean);

  it('classifies every utility it puts on the container', () => {
    for (const className of classes) {
      expect(UTILITY_PROPERTIES, `unclassified utility "${className}"`)
        .toHaveProperty(className);
    }
  });

  it('sets its own size rather than depending on properties MapLibre owns', () => {
    const owned = maplibreContainerProperties();
    const contested = classes
      .flatMap((className) => UTILITY_PROPERTIES[className] ?? [])
      .filter((property) => owned.has(property));

    expect(
      contested,
      `MapLibre's .maplibregl-map rule overrides these, so the utilities lose: ${contested.join(', ')}`,
    ).toEqual([]);
  });

  it('fills its parent box', () => {
    expect(classes).toContain('h-full');
    expect(classes).toContain('w-full');
  });
});
