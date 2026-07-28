import type { Map as MapLibreMap } from 'maplibre-gl';
import { toGeoJSON } from '../../lib/geo';
import { buildActivePinLayer, buildPinLayer } from '../layers/pins';
import { buildClusterLayers, buildClusterProperties } from '../layers/clusters';
import { SOURCE_ID, isMutedBaseLayer } from '../../config/mapStyle';
import { CLUSTER_MAX_ZOOM, CLUSTER_RADIUS } from '../../config/constants';
import type { Listing } from '../../types/listing';

/**
 * Hide the base-style layers listed in `MUTED_BASE_LAYER_PREFIXES`.
 *
 * Runs before our own layers are added, so it can only ever see the base
 * style's. Per-layer try/catch because a style is remote data: it can rename or
 * drop a layer between loads, and a basemap that lost a POI label must not cost
 * the map its listings.
 */
export function muteBaseLayers(map: MapLibreMap): void {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (!isMutedBaseLayer(layer.id)) continue;
    try {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    } catch (error) {
      console.warn(`[ListingMap] could not mute base layer "${layer.id}"`, error);
    }
  }
}

/**
 * Add the listings source and every layer that draws from it.
 *
 * Order matters: clusters first, then pins, then the enlarged highlight copy on
 * top, so a highlighted pin is never painted over by an ordinary one.
 */
export function registerListingLayers(map: MapLibreMap, listings: Listing[]): void {
  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: toGeoJSON(listings),
    cluster: true,
    clusterRadius: CLUSTER_RADIUS,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    // Aggregated as MapLibre clusters, so the donut layer can read a
    // cluster's category mix without ever expanding its leaves.
    clusterProperties: buildClusterProperties(),
  });

  for (const layer of buildClusterLayers()) map.addLayer(layer);
  map.addLayer(buildPinLayer());
  map.addLayer(buildActivePinLayer());
}
