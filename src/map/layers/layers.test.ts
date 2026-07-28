import { describe, it, expect } from 'vitest';
import { createExpression, validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { buildActivePinLayer, buildPinLayer } from './pins';
import { buildClusterLayers, buildClusterProperties } from './clusters';
import { DONUT_SIZE, HEAD_CENTER, donutSpriteIds } from '../sprite/donutShapes';
import { LAYER_CLUSTERS_ACTIVE, LAYER_PINS_ACTIVE, SOURCE_ID } from '../../config/mapStyle';

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
  const layout = layers[0].layout as Record<string, unknown>;

  it('draws the pin and its count as one symbol placement', () => {
    expect(layers[0].type).toBe('symbol');
    expect(layout['icon-image']).toBeDefined();
    expect(layout['text-field']).toEqual(['get', 'point_count_abbreviated']);
  });

  it('draws only clustered features', () => {
    for (const layer of layers) {
      expect(JSON.stringify((layer as { filter?: unknown }).filter))
        .toContain('point_count');
    }
  });

  it('interpolates icon size on point_count rather than using a fixed size', () => {
    const size = JSON.stringify(layout['icon-size']);
    expect(size).toContain('point_count');
    expect(size).toContain('interpolate');
  });

  it('lets clusters overlap so none is silently dropped', () => {
    expect(layout['icon-allow-overlap']).toBe(true);
    expect(layout['text-allow-overlap']).toBe(true);
  });

  it('anchors the pin by its tip, so it points at the place it stands for', () => {
    expect(layout['icon-anchor']).toBe('bottom');
  });
});

/**
 * Growing a symbol on hover needs a second layer: `icon-size` is a layout
 * property, and MapLibre rejects feature-state expressions there — the same
 * constraint that gave the pins their own highlight layer.
 */
describe('the hovered cluster layer', () => {
  const [base, active] = buildClusterLayers();
  const baseLayout = base.layout as Record<string, unknown>;
  const activeLayout = active.layout as Record<string, unknown>;

  const sizes = (layout: Record<string, unknown>, property: string) =>
    (layout[property] as unknown[]).filter((part) => typeof part === 'number');

  // Layers draw in the order addLayer receives them, so the enlarged copy has
  // to come second or it would be painted under the pin it is enlarging.
  it('is a distinct layer, returned after the base one', () => {
    const ids = buildClusterLayers().map((layer) => layer.id);
    expect(active.id).toBe(LAYER_CLUSTERS_ACTIVE);
    expect(ids.indexOf(active.id)).toBeGreaterThan(ids.indexOf(base.id));
  });

  it('starts matching no cluster, so nothing is enlarged before interaction', () => {
    expect(JSON.stringify((active as { filter?: unknown }).filter))
      .toContain('"literal",[]');
  });

  it('draws every cluster larger than the base layer does', () => {
    // Stops alternate count/value, so compare the pairs positionally.
    const baseSizes = sizes(baseLayout, 'icon-size');
    const activeSizes = sizes(activeLayout, 'icon-size');
    expect(activeSizes).toHaveLength(baseSizes.length);
    for (const [i, value] of activeSizes.entries()) {
      if (i % 2 === 1) expect(value).toBeGreaterThan(baseSizes[i]);
    }
  });

  /**
   * The offset that lifts the count into the head is a ratio of icon-size to
   * text-size, so scaling both by the same factor must leave it untouched.
   * Scaling only the icon would slide the number out of the enlarged head.
   */
  it('reuses the base text-offset, because it scales both sizes together', () => {
    expect(activeLayout['text-offset']).toEqual(baseLayout['text-offset']);
  });

  it('scales the count with the pin', () => {
    const baseText = sizes(baseLayout, 'text-size');
    const activeText = sizes(activeLayout, 'text-size');
    for (const [i, value] of activeText.entries()) {
      if (i % 2 === 1) expect(value).toBeGreaterThan(baseText[i]);
    }
  });
});

/**
 * The count has to sit in the hole of the ring, and the pin is anchored by its
 * tip — so the offset that lifts the number into the head is a pixel distance
 * that scales with icon-size, expressed in ems that scale with text-size.
 * Those two grow at different rates across point_count. A constant offset would
 * be correct at one cluster size and wrong at the others, which is the kind of
 * thing that looks fine in the one screenshot anybody checks.
 */
describe('the cluster count lands in the head at every cluster size', () => {
  const layout = buildClusterLayers()[0].layout as Record<string, unknown>;

  const compile = (expression: unknown, type: 'number' | 'array') =>
    createExpression(expression, {
      type,
      value: type === 'array' ? 'number' : undefined,
      length: type === 'array' ? 2 : undefined,
      'property-type': 'data-driven',
      expression: { parameters: ['zoom', 'feature'], interpolated: true },
    } as never);

  const iconSize = compile(layout['icon-size'], 'number');
  const textSize = compile(layout['text-size'], 'number');
  const textOffset = compile(layout['text-offset'], 'array');

  /** Re-derived from the sprite rather than copied, so a resize is caught. */
  const headRisePx = (DONUT_SIZE.height - HEAD_CENTER.y) / 2;

  it('all three expressions compile', () => {
    expect(iconSize.result).toBe('success');
    expect(textSize.result).toBe('success');
    expect(textOffset.result).toBe('success');
  });

  it('never misses the head centre by as much as a pixel', () => {
    if (
      iconSize.result !== 'success'
      || textSize.result !== 'success'
      || textOffset.result !== 'success'
    ) throw new Error('an expression did not compile');

    const worst: string[] = [];
    for (let count = 2; count <= 200; count += 1) {
      const feature = { properties: { point_count: count } } as never;
      const globals = { zoom: 8 } as never;

      const icon = iconSize.value.evaluate(globals, feature) as number;
      const text = textSize.value.evaluate(globals, feature) as number;
      const offset = textOffset.value.evaluate(globals, feature) as number[];

      // Where the number actually lands, against where the head centre is.
      const placedPx = -offset[1] * text;
      const wantedPx = headRisePx * icon;
      if (Math.abs(placedPx - wantedPx) >= 1) {
        worst.push(`${count}: off by ${(placedPx - wantedPx).toFixed(2)}px`);
      }
    }
    expect(worst).toEqual([]);
  });

  it('lifts the count above the anchor rather than below it', () => {
    if (textOffset.result !== 'success') throw new Error('did not compile');
    const offset = textOffset.value.evaluate(
      { zoom: 8 } as never, { properties: { point_count: 9 } } as never,
    ) as number[];
    expect(offset[0]).toBe(0);
    expect(offset[1]).toBeLessThan(0);
  });
});

describe('cluster category tallies', () => {
  it('counts the two categories the donut id is derived from', () => {
    expect(Object.keys(buildClusterProperties())).toEqual(['cat_g', 'cat_s']);
  });
});

/**
 * The donut is chosen by expression from a fixed set of pre-rendered sprites.
 * If the expression can produce an id nobody drew, that cluster renders as
 * nothing at all — so evaluate the real expression over every mix a cluster can
 * hold and require the answer to be a sprite that exists.
 */
describe('the donut expression only asks for sprites that exist', () => {
  const iconImage = (buildClusterLayers()[0].layout as Record<string, unknown>)['icon-image'];
  const compiled = createExpression(iconImage, {
    type: 'string',
    'property-type': 'data-driven',
    expression: { parameters: ['zoom', 'feature'] },
  } as never);

  const available = new Set(donutSpriteIds());

  it('compiles', () => {
    expect(compiled.result).toBe('success');
  });

  it('resolves to a known sprite for every reachable mix', () => {
    if (compiled.result !== 'success') throw new Error('expression did not compile');

    const unknown = new Set<string>();
    for (let total = 2; total <= 40; total += 1) {
      for (let g = 0; g <= total; g += 1) {
        for (let s = 0; s <= total - g; s += 1) {
          const id = compiled.value.evaluate(
            { zoom: 5 } as never,
            { properties: { cat_g: g, cat_s: s, point_count: total } } as never,
          ) as string;
          if (!available.has(id)) unknown.add(`${g}/${s} of ${total} → ${id}`);
        }
      }
    }
    expect([...unknown]).toEqual([]);
  });

  it('gives a single-category cluster the whole ring', () => {
    if (compiled.result !== 'success') throw new Error('expression did not compile');
    const evaluate = (properties: Record<string, number>) => compiled.value.evaluate(
      { zoom: 5 } as never, { properties } as never,
    );

    expect(evaluate({ cat_g: 8, cat_s: 0, point_count: 8 })).toBe('donut-10-0');
    expect(evaluate({ cat_g: 0, cat_s: 8, point_count: 8 })).toBe('donut-0-10');
    expect(evaluate({ cat_g: 0, cat_s: 0, point_count: 8 })).toBe('donut-0-0');
  });

  it('splits an even two-category cluster down the middle', () => {
    if (compiled.result !== 'success') throw new Error('expression did not compile');
    expect(compiled.value.evaluate(
      { zoom: 5 } as never,
      { properties: { cat_g: 5, cat_s: 5, point_count: 10 } } as never,
    )).toBe('donut-5-5');
  });
});
