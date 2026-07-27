import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { LAYER_CLUSTERS, LAYER_PINS } from '../../config/mapStyle';

/**
 * The pointer affordances that belong to the map alone.
 *
 * Cursor changes and cluster hover never leave the engine: a cluster is not a
 * listing, so it has nothing to say to the rail, and keeping it here also keeps
 * it off React's critical path entirely.
 */
export function bindPointerAffordances(
  map: MapLibreMap,
  onHoveredCluster: (clusterId: number | null) => void,
): void {
  const pointer = (on: boolean) => () => {
    map.getCanvas().style.cursor = on ? 'pointer' : '';
  };

  map.on('mouseenter', LAYER_PINS, pointer(true));
  map.on('mouseleave', LAYER_PINS, pointer(false));
  map.on('mouseenter', LAYER_CLUSTERS, pointer(true));
  map.on('mouseleave', LAYER_CLUSTERS, pointer(false));

  /**
   * `mousemove` rather than `mouseenter`, for the same reason as the pins:
   * sliding from one cluster onto the next never leaves the layer, so
   * `mouseenter` fires once and the highlight sticks to the one you came in
   * through.
   */
  map.on('mousemove', LAYER_CLUSTERS, (event: MapLayerMouseEvent) => {
    const clusterId = event.features?.[0]?.properties?.cluster_id;
    onHoveredCluster(typeof clusterId === 'number' ? clusterId : null);
  });
  map.on('mouseleave', LAYER_CLUSTERS, () => onHoveredCluster(null));
}
