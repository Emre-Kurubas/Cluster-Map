import { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ErrorEvent, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import type { Point } from 'geojson';
import { idsWithinBounds, toGeoJSON } from '../lib/geo';
import { loadPinImages } from './sprite/pinShapes';
import { loadDonutImages } from './sprite/donutShapes';
import { createTileErrorReporter } from './tileErrorReporter';
import { buildActivePinLayer, buildPinLayer } from './layers/pins';
import { buildClusterLayers, buildClusterProperties } from './layers/clusters';
import {
  LAYER_CLUSTERS, LAYER_CLUSTERS_ACTIVE, LAYER_PINS, LAYER_PINS_ACTIVE, SOURCE_ID,
  isMutedBaseLayer,
} from '../config/mapStyle';
import {
  CLUSTER_MAX_ZOOM, CLUSTER_RADIUS, MAX_ZOOM, MIN_ZOOM, PROVINCE_FLY_ZOOM,
} from '../config/constants';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';
import type { BBox, LngLat, MapEngine } from '../types/map';

export interface MapEngineOptions {
  styleUrl: string;
  initialBounds: BBox;
  onError(kind: 'tile' | 'webgl'): void;
  /** The basemap started serving again; retract whatever `onError` raised. */
  onRecover(): void;
}

const EASE = { duration: 700, essential: true } as const;

/** How long to wait for the style before reporting the map as unusable. */
const STYLE_LOAD_TIMEOUT_MS = 12_000;

/**
 * Hide the base-style layers listed in `MUTED_BASE_LAYER_PREFIXES`.
 *
 * Runs before our own layers are added, so it can only ever see the base
 * style's. Per-layer try/catch because a style is remote data: it can rename or
 * drop a layer between loads, and a basemap that lost a POI label must not cost
 * the map its listings.
 */
function muteBaseLayers(map: MapLibreMap): void {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (!isMutedBaseLayer(layer.id)) continue;
    try {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    } catch (error) {
      console.warn(`[ListingMap] could not mute base layer "${layer.id}"`, error);
    }
  }
}

/** Used when WebGL is unavailable — the UI degrades to the list alone. */
function createNullEngine(): MapEngine {
  const noop = () => {};
  const unsubscribe = () => noop;
  return {
    setData: noop,
    flyToBounds: noop,
    flyToPoint: noop,
    project: () => [0, 0] as [number, number],
    queryVisibleIds: () => [],
    setHovered: noop,
    setSelected: noop,
    zoomIn: noop,
    zoomOut: noop,
    resetView: noop,
    onIdle: unsubscribe,
    onMove: unsubscribe,
    onFeatureClick: unsubscribe,
    onFeatureHover: unsubscribe,
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
  { styleUrl, initialBounds, onError, onRecover }: MapEngineOptions,
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
      // No attribution control. Removed on request: the collapsed "i" button
      // sat in the bottom-right corner the legend and zoom stack already own.
      //
      // OpenStreetMap's ODbL and OpenFreeMap's terms both require the credit to
      // appear somewhere, so the host page must carry it — this component no
      // longer does. See README.
      attributionControl: false,
      // Pin geometry is flat; skipping the 3D pitch keeps interaction cheap.
      pitchWithRotate: false,
      dragRotate: false,
      // MapLibre labels its own canvas "Map" in English. It is the element that
      // actually takes focus and keyboard panning, so its name is the one a
      // screen reader reads out.
      locale: { 'Map.Title': t.mapCanvas },
    });
  } catch (error) {
    // Usually a missing WebGL context, but any constructor failure lands here.
    // Swallowing it silently made the map's absence impossible to diagnose, so
    // the real cause always reaches the console.
    console.error('[ListingMap] map construction failed', error);
    onError('webgl');
    return createNullEngine();
  }

  let pending: Listing[] = [];
  let ready = false;
  /**
   * Set by `destroy`. The `load` handler awaits sprite rasterization before it
   * registers anything, and MapLibre tears its style down on `remove()`, so
   * everything after that await has to check whether the map it is about to
   * mutate is still there.
   */
  let destroyed = false;
  let hoveredId: number | null = null;
  let selectedId: number | null = null;

  /**
   * Re-filter the highlight layer to the currently hovered/selected pins.
   * Cheap: no source mutation, no React render.
   */
  const refreshHighlight = () => {
    if (!ready || !map.getLayer(LAYER_PINS_ACTIVE)) return;
    const ids = [selectedId, hoveredId].filter((id): id is number => id !== null);
    map.setFilter(LAYER_PINS_ACTIVE, ['in', ['get', 'id'], ['literal', ids]] as never);
  };

  /** Swaps the enlarged cluster layer onto whichever cluster is under the pointer. */
  let hoveredClusterId: number | null = null;
  const setHoveredCluster = (clusterId: number | null) => {
    if (clusterId === hoveredClusterId) return;
    hoveredClusterId = clusterId;
    if (!map.getLayer(LAYER_CLUSTERS_ACTIVE)) return;
    map.setFilter(LAYER_CLUSTERS_ACTIVE, [
      'all',
      ['has', 'point_count'],
      ['in', ['get', 'cluster_id'], ['literal', clusterId === null ? [] : [clusterId]]],
    ] as never);
  };

  // Every MapLibre error reaches the console — filtering to tile failures alone
  // once hid a style that never loaded. What the user is told is a narrower
  // judgement, and it lives in tileErrorReporter.
  const tileErrors = createTileErrorReporter(
    () => onError('tile'),
    onRecover,
  );

  map.on('error', (event: ErrorEvent) => {
    console.error('[ListingMap] map error', event?.error ?? event);
    tileErrors.report(event, ready);
  });

  map.on('idle', () => tileErrors.settle());

  // If the style never loads, `load` never fires and the source and layers are
  // never registered — the map stays blank with an empty listing count. Say so
  // rather than failing silently.
  const loadWatchdog = setTimeout(() => {
    if (!ready) {
      console.error(
        `[ListingMap] style did not load within ${STYLE_LOAD_TIMEOUT_MS}ms: ${styleUrl}`,
      );
      onError('tile');
    }
  }, STYLE_LOAD_TIMEOUT_MS);

  map.on('load', async () => {
    clearTimeout(loadWatchdog);
    muteBaseLayers(map);
    await Promise.all([loadPinImages(map), loadDonutImages(map)]);

    // Sixty-nine SVG rasterizations happen inside that await, and React
    // StrictMode unmounts and remounts every effect — so in development an
    // unmount lands in this window on every single mount. Resuming against a
    // removed map threw out of an async event handler, where nothing could
    // catch it and the rejection went unhandled.
    if (destroyed) return;

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: toGeoJSON(pending),
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

    console.info(
      `[ListingMap] ready — ${pending.length} listing(s), ` +
      `canvas ${map.getCanvas().width}x${map.getCanvas().height}`,
    );

    const pointer = (on: boolean) => () => {
      map.getCanvas().style.cursor = on ? 'pointer' : '';
    };
    map.on('mouseenter', LAYER_PINS, pointer(true));
    map.on('mouseleave', LAYER_PINS, pointer(false));
    map.on('mouseenter', LAYER_CLUSTERS, pointer(true));
    map.on('mouseleave', LAYER_CLUSTERS, pointer(false));

    /**
     * Cluster hover is purely a map affair — a cluster is not a listing, so it
     * has nothing to say to the rail. It stays inside the engine rather than
     * routing through the store, which also keeps it off React's critical path.
     *
     * `mousemove` rather than `mouseenter`, for the same reason as the pins:
     * sliding from one cluster onto the next never leaves the layer.
     */
    map.on('mousemove', LAYER_CLUSTERS, (event: MapLayerMouseEvent) => {
      const clusterId = event.features?.[0]?.properties?.cluster_id;
      setHoveredCluster(typeof clusterId === 'number' ? clusterId : null);
    });
    map.on('mouseleave', LAYER_CLUSTERS, () => setHoveredCluster(null));

    ready = true;

    // A highlight asked for while the style was still coming up could only be
    // recorded — there were no layers to filter. Now there are, so apply it.
    // Without this a card clicked during load highlighted nothing on the map
    // for as long as that selection lasted.
    refreshHighlight();
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

    flyToPoint(center, zoom = PROVINCE_FLY_ZOOM, offset) {
      map.flyTo({ center, zoom, offset, ...EASE });
    },

    project(lngLat) {
      const point = map.project(lngLat);
      return [point.x, point.y];
    },

    queryVisibleIds() {
      // Answered from the viewport rectangle, not from rendered pins: the pin
      // layer excludes clustered points, so a Türkiye-wide view — where every
      // listing is inside a cluster — reported nothing visible at all.
      if (!ready) return [];
      const bounds = map.getBounds();
      return idsWithinBounds(pending, [
        bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
      ]);
    },

    setHovered(id) {
      hoveredId = id;
      refreshHighlight();
    },

    setSelected(id) {
      selectedId = id;
      refreshHighlight();
    },

    zoomIn: () => map.zoomIn({ duration: 300 }),
    zoomOut: () => map.zoomOut({ duration: 300 }),
    resetView: () =>
      map.fitBounds(initialBounds, { padding: 48, duration: EASE.duration }),

    onIdle(callback) {
      map.on('idle', callback);
      return () => map.off('idle', callback);
    },

    onMove(callback) {
      map.on('move', callback);
      map.on('resize', callback);
      return () => {
        map.off('move', callback);
        map.off('resize', callback);
      };
    },

    onFeatureClick(callback) {
      const handler = (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === 'number') callback(id);
      };
      map.on('click', LAYER_PINS, handler);
      return () => map.off('click', LAYER_PINS, handler);
    },

    onFeatureHover(callback) {
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
    },

    onClusterClick(callback) {
      const handler = (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        if (typeof clusterId !== 'number' || !feature) return;
        const center = (feature.geometry as Point).coordinates as LngLat;

        const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
        if (!source) return;

        // Asynchronous, and it can genuinely fail: the id goes stale the moment
        // the data changes under it, and the source is gone after unmount. An
        // uncaught rejection here is an unhandled promise rejection raised from
        // a click handler, so it is caught and the click simply does nothing.
        source.getClusterExpansionZoom(clusterId).then(
          (zoom) => {
            if (destroyed) return;
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
    },

    destroy: () => {
      destroyed = true;
      ready = false;
      clearTimeout(loadWatchdog);
      map.remove();
    },
  };
}
