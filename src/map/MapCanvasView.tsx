import { useEffect, useRef } from 'react';
import { createMapEngine } from './createMapEngine';
import { rafThrottle } from '../lib/throttle';
import { TURKEY_BBOX } from '../config/constants';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';
import type { MapEngine } from '../types/map';

export interface MapCanvasViewProps {
  listings: Listing[];
  styleUrl: string;
  onEngineReady(engine: MapEngine): void;
  onError(kind: 'tile' | 'webgl'): void;
  onRecover(): void;
  /** Listings inside the viewport, recomputed whenever the camera settles. */
  onVisibleIdsChange(ids: number[]): void;
  onSelect(id: number | null): void;
  onHover(id: number | null): void;
}

/**
 * Owns the MapLibre instance. Renders only the container element — pins,
 * clusters and highlights are all GPU layers, never React children.
 */
export function MapCanvasView({
  listings,
  styleUrl,
  onEngineReady,
  onError,
  onRecover,
  onVisibleIdsChange,
  onSelect,
  onHover,
}: MapCanvasViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);

  // Create once. styleUrl changes are rare enough to warrant a full rebuild.
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const engine = createMapEngine(containerRef.current, {
      styleUrl,
      initialBounds: TURKEY_BBOX,
      onError,
      onRecover,
    });
    engineRef.current = engine;
    onEngineReady(engine);

    const syncViewport = rafThrottle(() => onVisibleIdsChange(engine.queryVisibleIds()));
    const offIdle = engine.onIdle(syncViewport);
    const offClick = engine.onFeatureClick((id) => onSelect(id));
    const offHover = engine.onFeatureHover((id) => onHover(id));
    const offCluster = engine.onClusterClick(() => onSelect(null));

    return () => {
      syncViewport.cancel();
      offIdle();
      offClick();
      offHover();
      offCluster();
      // The pointer is not over anything once the map is gone; leaving the id
      // behind would keep a phantom card highlighted in the rail.
      onHover(null);
      engine.destroy();
      engineRef.current = null;
    };
    // The callbacks come from the connected half, which holds them stable, so
    // listing them here does not rebuild the map on every render.
  }, [styleUrl, onEngineReady, onError, onRecover, onVisibleIdsChange, onSelect, onHover]);

  // Push filtered data into the existing source; never recreate the map.
  useEffect(() => {
    engineRef.current?.setData(listings);
  }, [listings]);

  // Sized with h-full/w-full rather than `absolute inset-0`: MapLibre adds
  // `.maplibregl-map` to this element, and its unlayered stylesheet outranks
  // Tailwind's `@layer utilities` whatever the import order. `position:
  // relative` therefore won, `inset-0` stopped stretching anything, and the
  // container collapsed to 0px tall — a blank map and an empty results rail.
  // MapLibre declares no width or height, so these two are uncontested.
  //
  // A landmark, not `aria-hidden`. Hiding it was wrong twice over: MapLibre
  // puts a focusable canvas in here, so clicking a pin parked the focus inside
  // an aria-hidden subtree — which browsers refuse to honour anyway, logging
  // "Blocked aria-hidden on an element because its descendant retained focus"
  // and exposing the subtree regardless. The map is an interactive control
  // that pans and zooms from the keyboard; it belongs in the tree, named.
  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="region"
      aria-label={t.mapRegion}
    />
  );
}
