import type { LayerSpecification } from 'maplibre-gl';
import { LAYER_CLUSTERS, LAYER_CLUSTER_COUNT, SOURCE_ID } from '../../config/mapStyle';

/**
 * Clusters are a circle plus a count label. Radius and color both interpolate
 * on point_count so density is legible at a glance without a legend.
 */
export function buildClusterLayers(): LayerSpecification[] {
  return [
    {
      id: LAYER_CLUSTERS,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'interpolate', ['linear'], ['get', 'point_count'],
          2, '#8fc0e6',
          15, '#5b9bd1',
          50, '#3b77ac',
        ],
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'point_count'],
          2, 16,
          15, 24,
          50, 34,
        ],
        'circle-opacity': 0.92,
        'circle-stroke-width': 3,
        'circle-stroke-color': 'rgba(255,255,255,0.75)',
      },
    },
    {
      id: LAYER_CLUSTER_COUNT,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
      },
    },
  ];
}
