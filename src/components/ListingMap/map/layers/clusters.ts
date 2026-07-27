import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl';
import { LAYER_CLUSTERS, LAYER_CLUSTERS_ACTIVE, SOURCE_ID } from '../../config/mapStyle';
import { DONUT_STEPS, HEAD_CENTER, DONUT_SIZE } from '../sprite/donutShapes';

/**
 * Sprite pixels between the pin's tip and its head centre, in CSS pixels at
 * icon-size 1. Sprites are registered at pixelRatio 2, so sprite units halve.
 */
const HEAD_RISE_PX = (DONUT_SIZE.height - HEAD_CENTER.y) / 2;

/** Cluster size and count size, sampled at the same point_count breakpoints. */
const SIZE_STOPS = [
  { count: 2, icon: 0.72, text: 13 },
  { count: 15, icon: 0.95, text: 13.8125 },
  { count: 50, icon: 1.25, text: 16 },
] as const;

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

function stopsFor(key: 'icon' | 'text', scale = 1): ExpressionSpecification {
  return [
    'interpolate', ['linear'], ['get', 'point_count'],
    ...SIZE_STOPS.flatMap((stop) => [stop.count, stop[key] * scale]),
  ] as ExpressionSpecification;
}

/**
 * How far above the anchor the count has to sit, in ems of its own type size.
 *
 * The icon is anchored by the pin's tip, so the head — and the hole the number
 * belongs in — is `HEAD_RISE_PX × icon-size` above the anchor point. That is a
 * pixel distance, but `text-offset` is denominated in ems, which means the
 * right offset depends on the type size as well. Both sizes grow with
 * point_count and they do not grow in step, so a single constant would let the
 * number drift out of the head at one end of the range. Sampling the ratio at
 * the same breakpoints pins it at each one; in between, the two interpolations
 * disagree by well under a pixel.
 */
function countOffsetExpression(): ExpressionSpecification {
  return [
    'interpolate', ['linear'], ['get', 'point_count'],
    ...SIZE_STOPS.flatMap((stop) => [
      stop.count,
      ['literal', [0, -(HEAD_RISE_PX * stop.icon) / stop.text]],
    ]),
  ] as ExpressionSpecification;
}

/** How much the hovered cluster grows. */
export const CLUSTER_HOVER_SCALE = 1.16;

/** Matches no cluster. The starting filter for the highlight layer. */
export const NO_CLUSTER: unknown[] = [
  'all', ['has', 'point_count'], ['in', ['get', 'cluster_id'], ['literal', []]],
];

/**
 * The pin and its count are one symbol placement, so the number can never
 * drift off the ring it belongs to.
 *
 * Two layers of it, though: the second is an enlarged copy filtered to the
 * cluster under the pointer, which is the only way to grow a symbol on hover —
 * `icon-size` is a layout property and MapLibre rejects feature-state there.
 *
 * The copy scales icon-size and text-size by the same factor, which is what
 * lets it reuse `text-offset` untouched: the offset is a ratio of the two, so
 * scaling both leaves it unchanged.
 */
export function buildClusterLayers(): LayerSpecification[] {
  const base = (scale: number): LayerSpecification['layout'] => ({
    'icon-image': donutIconExpression(),
    // Density reads from the pin's size as well as its colours.
    'icon-size': stopsFor('icon', scale),
    // The tip marks the place, exactly as it does for a single listing.
    'icon-anchor': 'bottom',
    'icon-allow-overlap': true,
    'text-field': ['get', 'point_count_abbreviated'],
    'text-font': ['Noto Sans Bold'],
    'text-size': stopsFor('text', scale),
    'text-offset': countOffsetExpression(),
    'text-allow-overlap': true,
    'text-ignore-placement': true,
  });

  return [
    {
      id: LAYER_CLUSTERS,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: base(1),
      paint: { 'text-color': '#22313f' },
    },
    {
      id: LAYER_CLUSTERS_ACTIVE,
      type: 'symbol',
      source: SOURCE_ID,
      filter: NO_CLUSTER as never,
      layout: base(CLUSTER_HOVER_SCALE),
      paint: { 'text-color': '#22313f' },
    },
  ];
}
