import { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ErrorEvent, GeoJSONSource } from 'maplibre-gl';
import { idsWithinBounds, toGeoJSON } from '../lib/geo';
import { loadPinImages } from './sprite/pinShapes';
import { registerDonutSpriteResolver } from './sprite/donutShapes';
import { createTileErrorReporter } from './tileErrorReporter';
import { createNullEngine } from './engine/nullEngine';
import { createHighlight } from './engine/highlight';
import { muteBaseLayers, registerListingLayers } from './engine/registerLayers';
import { bindPointerAffordances } from './engine/pointerLayers';
import * as subscribe from './engine/subscriptions';
import { SOURCE_ID } from '../config/mapStyle';
import { MAX_ZOOM, MIN_ZOOM, PROVINCE_FLY_ZOOM } from '../config/constants';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';
import type { BBox, MapEngine } from '../types/map';

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
 * Wraps a MapLibre instance behind the MapEngine interface.
 *
 * Everything visual — pins, clusters, hover, selection — happens through
 * layers and feature-state. React never renders a marker, so pan and zoom
 * cost no React work at all.
 *
 * This function owns the lifecycle and nothing else. What the map draws lives
 * in `engine/registerLayers`, what stands out in `engine/highlight`, what the
 * pointer does in `engine/pointerLayers`, and the event surface in
 * `engine/subscriptions`.
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
      // appear, so the host page must carry it — this component no longer
      // does. See README.
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

  const highlight = createHighlight(map, () => ready);

  // Every MapLibre error reaches the console — filtering to tile failures alone
  // once hid a style that never loaded. What the user is told is a narrower
  // judgement, and it lives in tileErrorReporter.
  const tileErrors = createTileErrorReporter(() => onError('tile'), onRecover);

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

    // Donuts draw on demand. Installing the resolver is synchronous, so the
    // 66 cluster mixes no longer stand between the style loading and the pins
    // appearing — a real dataset asks for a handful of them.
    registerDonutSpriteResolver(map);

    // The three pin sprites stay eager: they are always needed, and they are
    // what the map draws first.
    await loadPinImages(map);

    // React StrictMode unmounts and remounts every effect, so in development an
    // unmount lands inside that await on every single mount. Resuming against a
    // removed map threw out of an async event handler, where nothing could
    // catch it and the rejection went unhandled.
    if (destroyed) return;

    registerListingLayers(map, pending);

    console.info(
      `[ListingMap] ready — ${pending.length} listing(s), ` +
      `canvas ${map.getCanvas().width}x${map.getCanvas().height}`,
    );

    bindPointerAffordances(map, highlight.setHoveredCluster);

    ready = true;

    // A highlight asked for while the style was still coming up could only be
    // recorded — there were no layers to filter. Now there are, so apply it.
    // Without this a card clicked during load highlighted nothing on the map
    // for as long as that selection lasted.
    highlight.refresh();
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

    setHovered: highlight.setHovered,
    setSelected: highlight.setSelected,

    zoomIn: () => map.zoomIn({ duration: 300 }),
    zoomOut: () => map.zoomOut({ duration: 300 }),
    resetView: () =>
      map.fitBounds(initialBounds, { padding: 48, duration: EASE.duration }),

    onIdle: (callback) => subscribe.onIdle(map, callback),
    onMove: (callback) => subscribe.onMove(map, callback),
    onFeatureClick: (callback) => subscribe.onFeatureClick(map, callback),
    onFeatureHover: (callback) => subscribe.onFeatureHover(map, callback),
    onClusterClick: (callback) =>
      subscribe.onClusterClick(map, callback, () => destroyed),

    destroy: () => {
      destroyed = true;
      ready = false;
      clearTimeout(loadWatchdog);
      map.remove();
    },
  };
}
