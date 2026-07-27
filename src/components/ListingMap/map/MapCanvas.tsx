import { useEffect, useRef } from 'react';
import { createMapEngine } from './createMapEngine';
import { rafThrottle } from '../lib/throttle';
import { useListingStore } from '../store/useListingStore';
import { TURKEY_BBOX } from '../config/constants';
import type { Listing } from '../types/listing';
import type { MapEngine } from '../types/map';

interface MapCanvasProps {
  listings: Listing[];
  styleUrl: string;
  onEngineReady(engine: MapEngine): void;
  onError(kind: 'tile' | 'webgl'): void;
}

/**
 * Owns the MapLibre instance. Renders only the container element — pins,
 * clusters and highlights are all GPU layers, never React children.
 */
export function MapCanvas({ listings, styleUrl, onEngineReady, onError }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);

  // Create once. styleUrl changes are rare enough to warrant a full rebuild.
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const engine = createMapEngine(containerRef.current, {
      styleUrl,
      initialBounds: TURKEY_BBOX,
      onError,
    });
    engineRef.current = engine;
    onEngineReady(engine);

    const { setVisibleIds, select } = useListingStore.getState();

    const syncViewport = rafThrottle(() => setVisibleIds(engine.queryVisibleIds()));
    const offIdle = engine.onIdle(syncViewport);
    const offClick = engine.onFeatureClick((id) => select(id));
    const offCluster = engine.onClusterClick(() => select(null));

    return () => {
      syncViewport.cancel();
      offIdle();
      offClick();
      offCluster();
      engine.destroy();
      engineRef.current = null;
    };
  }, [styleUrl, onEngineReady, onError]);

  // Push filtered data into the existing source; never recreate the map.
  useEffect(() => {
    engineRef.current?.setData(listings);
  }, [listings]);

  return <div ref={containerRef} className="absolute inset-0" aria-hidden />;
}
