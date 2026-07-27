import { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ErrorEvent, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import type { Point } from 'geojson';
import { toGeoJSON } from '../lib/geo';
import { loadPinImages } from './sprite/pinShapes';
import { buildPinLayer } from './layers/pins';
import { buildClusterLayers } from './layers/clusters';
import { LAYER_CLUSTERS, LAYER_PINS, SOURCE_ID } from '../config/mapStyle';
import {
  CLUSTER_MAX_ZOOM, CLUSTER_RADIUS, MAX_ZOOM, MIN_ZOOM, PROVINCE_FLY_ZOOM,
} from '../config/constants';
import type { Listing } from '../types/listing';
import type { BBox, LngLat, MapEngine } from '../types/map';

export interface MapEngineOptions {
  styleUrl: string;
  initialBounds: BBox;
  onError(kind: 'tile' | 'webgl'): void;
}

const EASE = { duration: 700, essential: true } as const;

/** Used when WebGL is unavailable — the UI degrades to the list alone. */
function createNullEngine(): MapEngine {
  const noop = () => {};
  const unsubscribe = () => noop;
  return {
    setData: noop,
    flyToBounds: noop,
    flyToPoint: noop,
    queryVisibleIds: () => [],
    setHovered: noop,
    setSelected: noop,
    zoomIn: noop,
    zoomOut: noop,
    resetView: noop,
    onIdle: unsubscribe,
    onFeatureClick: unsubscribe,
    onClusterClick: unsubscribe,
    destroy: noop,
  };
}

/**
 * Wraps a MapLibre instance behind the MapEngine interface.
 *
 * Everything visual — pins, clusters, hover, selection — happens through
 * layers and feature-state. React never renders a marker, so pan and zoom
 * cost no React work at all.
 */
export function createMapEngine(
  container: HTMLDivElement,
  { styleUrl, initialBounds, onError }: MapEngineOptions,
): MapEngine {
  let map: MapLibreMap;
  try {
    map = new MapLibreMap({
      container,
      style: styleUrl,
      bounds: initialBounds,
      fitBoundsOptions: { padding: 48 },
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      attributionControl: { compact: true },
      // Pin geometry is flat; skipping the 3D pitch keeps interaction cheap.
      pitchWithRotate: false,
      dragRotate: false,
    });
  } catch {
    // No WebGL context available in this browser.
    onError('webgl');
    return createNullEngine();
  }

  let pending: Listing[] = [];
  let ready = false;
  let hoveredId: number | null = null;
  let selectedId: number | null = null;

  const setFeatureState = (id: number | null, key: string, value: boolean) => {
    if (id === null || !ready) return;
    map.setFeatureState({ source: SOURCE_ID, id }, { [key]: value });
  };

  map.on('error', (event: ErrorEvent) => {
    // Tile 404s surface here; style/source failures should not kill the UI.
    if (/tile/i.test(String(event?.error?.message ?? ''))) {
      onError('tile');
    }
  });

  map.on('load', async () => {
    await loadPinImages(map);

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: toGeoJSON(pending),
      cluster: true,
      clusterRadius: CLUSTER_RADIUS,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    });

    for (const layer of buildClusterLayers()) map.addLayer(layer);
    map.addLayer(buildPinLayer());

    const pointer = (on: boolean) => () => {
      map.getCanvas().style.cursor = on ? 'pointer' : '';
    };
    map.on('mouseenter', LAYER_PINS, pointer(true));
    map.on('mouseleave', LAYER_PINS, pointer(false));
    map.on('mouseenter', LAYER_CLUSTERS, pointer(true));
    map.on('mouseleave', LAYER_CLUSTERS, pointer(false));

    ready = true;
  });

  return {
    setData(listings) {
      pending = listings;
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (source) source.setData(toGeoJSON(listings));
    },

    flyToBounds(bbox) {
      map.fitBounds(bbox, { padding: 64, duration: EASE.duration, essential: true });
    },

    flyToPoint(center, zoom = PROVINCE_FLY_ZOOM) {
      map.flyTo({ center, zoom, ...EASE });
    },

    queryVisibleIds() {
      if (!ready) return [];
      const features = map.queryRenderedFeatures({ layers: [LAYER_PINS] });
      const ids = new Set<number>();
      for (const feature of features) {
        const id = feature.properties?.id;
        if (typeof id === 'number') ids.add(id);
      }
      return [...ids];
    },

    setHovered(id) {
      setFeatureState(hoveredId, 'hovered', false);
      hoveredId = id;
      setFeatureState(hoveredId, 'hovered', true);
    },

    setSelected(id) {
      setFeatureState(selectedId, 'selected', false);
      selectedId = id;
      setFeatureState(selectedId, 'selected', true);
    },

    zoomIn: () => map.zoomIn({ duration: 300 }),
    zoomOut: () => map.zoomOut({ duration: 300 }),
    resetView: () =>
      map.fitBounds(initialBounds, { padding: 48, duration: EASE.duration }),

    onIdle(callback) {
      map.on('idle', callback);
      return () => map.off('idle', callback);
    },

    onFeatureClick(callback) {
      const handler = (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === 'number') callback(id);
      };
      map.on('click', LAYER_PINS, handler);
      return () => map.off('click', LAYER_PINS, handler);
    },

    onClusterClick(callback) {
      const handler = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        if (typeof clusterId !== 'number' || !feature) return;
        const center = (feature.geometry as Point).coordinates as LngLat;

        const source = map.getSource(SOURCE_ID) as GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center, zoom, duration: 500 });
          callback(clusterId, center);
        });
      };
      map.on('click', LAYER_CLUSTERS, handler);
      return () => map.off('click', LAYER_CLUSTERS, handler);
    },

    destroy: () => map.remove(),
  };
}
