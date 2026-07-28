import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import type { Point } from 'geojson';
import { LAYER_CLUSTERS, LAYER_PINS, SOURCE_ID } from '../../config/mapStyle';
import type { LngLat } from '../../types/map';

type Unsubscribe = () => void;

/**
 * The engine's event surface.
 *
 * Each one returns its own unsubscribe rather than relying on the map being
 * destroyed, because React effects re-run for reasons that have nothing to do
 * with the map's lifetime.
 */
export function onIdle(map: MapLibreMap, callback: () => void): Unsubscribe {
  map.on('idle', callback);
  return () => map.off('idle', callback);
}

export function onMove(map: MapLibreMap, callback: () => void): Unsubscribe {
  map.on('move', callback);
  map.on('resize', callback);
  return () => {
    map.off('move', callback);
    map.off('resize', callback);
  };
}

export function onFeatureClick(
  map: MapLibreMap,
  callback: (id: number) => void,
): Unsubscribe {
  const handler = (event: MapLayerMouseEvent) => {
    const id = event.features?.[0]?.properties?.id;
    if (typeof id === 'number') callback(id);
  };
  map.on('click', LAYER_PINS, handler);
  return () => map.off('click', LAYER_PINS, handler);
}

export function onFeatureHover(
  map: MapLibreMap,
  callback: (id: number | null) => void,
): Unsubscribe {
  // `mousemove`, not `mouseenter`: sliding from one pin straight onto its
  // neighbour never leaves the layer, so `mouseenter` fires once and the
  // highlight stays stuck on the pin the pointer entered through.
  const move = (event: MapLayerMouseEvent) => {
    const id = event.features?.[0]?.properties?.id;
    callback(typeof id === 'number' ? id : null);
  };
  const leave = () => callback(null);

  map.on('mousemove', LAYER_PINS, move);
  map.on('mouseleave', LAYER_PINS, leave);
  return () => {
    map.off('mousemove', LAYER_PINS, move);
    map.off('mouseleave', LAYER_PINS, leave);
  };
}

export function onClusterClick(
  map: MapLibreMap,
  callback: (clusterId: number, center: LngLat) => void,
  isDestroyed: () => boolean,
): Unsubscribe {
  const handler = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const clusterId = feature?.properties?.cluster_id;
    if (typeof clusterId !== 'number' || !feature) return;
    const center = (feature.geometry as Point).coordinates as LngLat;

    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    // Asynchronous, and it can genuinely fail: the id goes stale the moment the
    // data changes under it, and the source is gone after unmount. An uncaught
    // rejection here is an unhandled promise rejection raised from a click
    // handler, so it is caught and the click simply does nothing.
    source.getClusterExpansionZoom(clusterId).then(
      (zoom) => {
        if (isDestroyed()) return;
        map.easeTo({ center, zoom, duration: 500 });
        callback(clusterId, center);
      },
      (error) => {
        console.warn('[ListingMap] cluster expansion zoom failed', error);
      },
    );
  };
  map.on('click', LAYER_CLUSTERS, handler);
  return () => map.off('click', LAYER_CLUSTERS, handler);
}
