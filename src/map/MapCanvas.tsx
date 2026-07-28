import { useCallback } from 'react';
import { useListingStoreApi } from '../store/ListingStoreContext';
import { MapCanvasView } from './MapCanvasView';
import type { Listing } from '../types/listing';
import type { MapEngine } from '../types/map';

interface MapCanvasProps {
  listings: Listing[];
  styleUrl: string;
  onEngineReady(engine: MapEngine): void;
  onError(kind: 'tile' | 'webgl'): void;
  onRecover(): void;
}

/**
 * The map, wired to the surrounding `<ListingMap>`.
 *
 * Reaches for the store api rather than subscribing to a slice: these are
 * actions, and reading them through `getState()` inside stable callbacks is
 * what keeps panning and hovering off React's critical path entirely.
 *
 * The three callbacks must hold their identity, or the view would tear down and
 * rebuild the MapLibre instance on every render. `storeApi` is stable for this
 * component's life, so they do.
 */
export function MapCanvas(props: MapCanvasProps) {
  const storeApi = useListingStoreApi();

  const onVisibleIdsChange = useCallback(
    (ids: number[]) => storeApi.getState().setVisibleIds(ids),
    [storeApi],
  );
  const onSelect = useCallback(
    (id: number | null) => storeApi.getState().select(id),
    [storeApi],
  );
  const onHover = useCallback(
    (id: number | null) => storeApi.getState().hover(id),
    [storeApi],
  );

  return (
    <MapCanvasView
      {...props}
      onVisibleIdsChange={onVisibleIdsChange}
      onSelect={onSelect}
      onHover={onHover}
    />
  );
}
