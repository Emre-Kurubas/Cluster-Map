import { describe, it, expect } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { buildActivePinLayer, buildPinLayer } from './pins';
import { buildClusterLayers } from './clusters';
import { LAYER_PINS_ACTIVE, SOURCE_ID } from '../../config/mapStyle';

/**
 * MapLibre rejects `feature-state` expressions in layout properties at
 * addLayer time. Violating this threw, so the pin layer was never registered:
 * no pins, and every viewport query failed with "layer does not exist".
 * Guarding every layer, not just the one that got it wrong.
 */
function expectNoFeatureStateInLayout(layer: { layout?: unknown; id: string }) {
  expect(
    JSON.stringify(layer.layout ?? {}),
    `${layer.id} layout must not use feature-state`,
  ).not.toContain('feature-state');
}

describe('buildPinLayer', () => {
  const layer = buildPinLayer();

  it('is a symbol layer bound to the listing source', () => {
    expect(layer.type).toBe('symbol');
    expect((layer as { source: string }).source).toBe(SOURCE_ID);
  });

  it('hides clustered points so only leaves draw pins', () => {
    expect((layer as { filter?: unknown }).filter).toEqual(['!', ['has', 'point_count']]);
  });

  it('maps the category property onto ascii sprite ids', () => {
    const iconImage = (layer.layout as Record<string, unknown>)['icon-image'] as unknown[];
    expect(iconImage[0]).toBe('match');
    expect(iconImage[1]).toEqual(['get', 'category']);
    const serialized = JSON.stringify(iconImage);
    expect(serialized).toContain('Araç');
    expect(serialized).toContain('pin-arac');
  });

  it('falls back to a known sprite for an unrecognized category', () => {
    const iconImage = (layer.layout as Record<string, unknown>)['icon-image'] as unknown[];
    expect(iconImage[iconImage.length - 1]).toBe('pin-gayrimenkul');
  });

  it('uses a constant icon-size', () => {
    expect((layer.layout as Record<string, unknown>)['icon-size']).toBe(1);
  });

  it('allows overlap so dense areas keep every pin visible', () => {
    expect((layer.layout as Record<string, unknown>)['icon-allow-overlap']).toBe(true);
  });
});

describe('layout properties never use feature-state', () => {
  it('holds for every layer this module builds', () => {
    const all = [buildPinLayer(), buildActivePinLayer(), ...buildClusterLayers()];
    for (const layer of all) expectNoFeatureStateInLayout(layer);
  });
});

/**
 * The definitive guard: validate against MapLibre's own style spec, the same
 * code addLayer runs. A `feature-state` expression in `icon-size` passed every
 * hand-written assertion here and still threw at runtime, taking the entire pin
 * layer with it. Anything addLayer would reject now fails in CI instead.
 */
describe('layers validate against the MapLibre style spec', () => {
  const style = {
    version: 8 as const,
    name: 'listing-map-test',
    sources: {
      [SOURCE_ID]: {
        type: 'geojson' as const,
        data: { type: 'FeatureCollection' as const, features: [] },
      },
    },
    layers: [buildPinLayer(), buildActivePinLayer(), ...buildClusterLayers()],
  };

  it('reports no validation errors', () => {
    const errors = validateStyleMin(style as never);
    expect(errors.map((error) => error.message)).toEqual([]);
  });
});

describe('buildActivePinLayer', () => {
  const layer = buildActivePinLayer();

  it('draws an enlarged pin so highlighting is visible', () => {
    const size = (layer.layout as Record<string, unknown>)['icon-size'] as number;
    const base = (buildPinLayer().layout as Record<string, unknown>)['icon-size'] as number;
    expect(size).toBeGreaterThan(base);
  });

  it('starts matching nothing, so no pin is highlighted before interaction', () => {
    expect((layer as { filter?: unknown }).filter)
      .toEqual(['in', ['get', 'id'], ['literal', []]]);
  });

  it('is a separate layer from the base pins', () => {
    expect(layer.id).toBe(LAYER_PINS_ACTIVE);
    expect(layer.id).not.toBe(buildPinLayer().id);
  });

  it('shares the base layer icon mapping so highlights keep their category', () => {
    const active = (layer.layout as Record<string, unknown>)['icon-image'];
    const base = (buildPinLayer().layout as Record<string, unknown>)['icon-image'];
    expect(active).toEqual(base);
  });
});

describe('buildClusterLayers', () => {
  const layers = buildClusterLayers();

  it('produces a circle layer and a count label layer', () => {
    expect(layers.map((l) => l.type)).toEqual(['circle', 'symbol']);
  });

  it('draws only clustered features', () => {
    for (const layer of layers) {
      expect((layer as { filter?: unknown }).filter).toEqual(['has', 'point_count']);
    }
  });

  it('interpolates circle radius on point_count rather than using a fixed size', () => {
    const radius = (layers[0].paint as Record<string, unknown>)['circle-radius'];
    expect(JSON.stringify(radius)).toContain('point_count');
    expect(JSON.stringify(radius)).toContain('interpolate');
  });

  it('renders the abbreviated count text', () => {
    const textField = (layers[1].layout as Record<string, unknown>)['text-field'];
    expect(textField).toEqual(['get', 'point_count_abbreviated']);
  });
});
