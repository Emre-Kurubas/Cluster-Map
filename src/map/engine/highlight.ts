import type { Map as MapLibreMap } from 'maplibre-gl';
import { LAYER_CLUSTERS_ACTIVE, LAYER_PINS_ACTIVE } from '../../config/mapStyle';

export interface HighlightController {
  setSelected(id: number | null): void;
  setHovered(id: number | null): void;
  setHoveredCluster(clusterId: number | null): void;
  /** Re-apply whatever is recorded. Call once the layers exist. */
  refresh(): void;
}

/**
 * Which pins and which cluster are drawn enlarged.
 *
 * Everything here is a `setFilter` on a layer that already exists — no source
 * mutation, no React render. Enlarging in place is not an option: `icon-size`
 * is a layout property and MapLibre rejects `feature-state` in layout
 * properties outright, so a second, larger copy of each layer is filtered onto
 * whatever should stand out.
 *
 * State is held here rather than passed in because a highlight can be asked for
 * before the style has loaded, and it has to survive until there is something
 * to apply it to.
 */
export function createHighlight(
  map: MapLibreMap,
  isReady: () => boolean,
): HighlightController {
  let hoveredId: number | null = null;
  let selectedId: number | null = null;
  let hoveredClusterId: number | null = null;

  const refresh = () => {
    if (!isReady() || !map.getLayer(LAYER_PINS_ACTIVE)) return;
    const ids = [selectedId, hoveredId].filter((id): id is number => id !== null);
    map.setFilter(LAYER_PINS_ACTIVE, ['in', ['get', 'id'], ['literal', ids]] as never);
  };

  return {
    setSelected(id) {
      selectedId = id;
      refresh();
    },

    setHovered(id) {
      hoveredId = id;
      refresh();
    },

    /** Swaps the enlarged cluster layer onto whichever cluster is under the pointer. */
    setHoveredCluster(clusterId) {
      if (clusterId === hoveredClusterId) return;
      hoveredClusterId = clusterId;
      if (!map.getLayer(LAYER_CLUSTERS_ACTIVE)) return;
      map.setFilter(LAYER_CLUSTERS_ACTIVE, [
        'all',
        ['has', 'point_count'],
        ['in', ['get', 'cluster_id'], ['literal', clusterId === null ? [] : [clusterId]]],
      ] as never);
    },

    refresh,
  };
}
