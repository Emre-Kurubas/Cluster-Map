import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl';
import { LAYER_CLUSTERS, SOURCE_ID } from '../../config/mapStyle';
import { DONUT_STEPS } from '../sprite/donutShapes';

/**
 * Per-category tallies MapLibre accumulates while it clusters.
 *
 * Only the first two are stored: araç is whatever the count does not account
 * for, so keeping it would add a third number that can never disagree with the
 * other two.
 */
export function buildClusterProperties() {
  return {
    cat_g: ['+', ['case', ['==', ['get', 'category'], 'Gayrimenkul'], 1, 0]],
    cat_s: ['+', ['case', ['==', ['get', 'category'], 'Arsa'], 1, 0]],
  };
}

/**
 * Picks the pre-rendered donut whose mix matches this cluster.
 *
 * The shares round independently, so they can add up to more than the whole —
 * 55%/45% rounds to 6 and 5 tenths. Clamping the second keeps the id inside the
 * generated set rather than asking for a sprite nobody drew.
 */
function donutIconExpression(): ExpressionSpecification {
  const share = (property: string): ExpressionSpecification => [
    'round', ['*', DONUT_STEPS, ['/', ['get', property], ['get', 'point_count']]],
  ];

  return [
    'let', 'a', share('cat_g'),
    [
      'let', 'b', ['min', share('cat_s'), ['-', DONUT_STEPS, ['var', 'a']]],
      [
        'concat',
        'donut-', ['to-string', ['var', 'a']],
        '-', ['to-string', ['var', 'b']],
      ],
    ],
  ];
}

/**
 * One symbol layer, not two: the donut and its count are a single placement, so
 * the number can never drift off the ring it belongs to.
 */
export function buildClusterLayers(): LayerSpecification[] {
  return [
    {
      id: LAYER_CLUSTERS,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': donutIconExpression(),
        // Density reads from the ring's size as well as its colours.
        'icon-size': [
          'interpolate', ['linear'], ['get', 'point_count'],
          2, 0.72,
          15, 0.95,
          50, 1.25,
        ],
        'icon-allow-overlap': true,
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Noto Sans Bold'],
        'text-size': [
          'interpolate', ['linear'], ['get', 'point_count'],
          2, 13,
          50, 16,
        ],
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#22313f',
      },
    },
  ];
}
