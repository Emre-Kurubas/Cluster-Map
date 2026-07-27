import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapCanvas } from './map/MapCanvas';
import { SearchBar } from './search/SearchBar';
import { FilterBar } from './filters/FilterBar';
import { ResultsRail } from './list/ResultsRail';
import { ListingDetail } from './detail/ListingDetail';
import { MapControls } from './controls/MapControls';
import { RailToggle } from './controls/RailToggle';
import { ErrorNotice } from './controls/ErrorNotice';
import { useSearchIndex } from './search/useSearchIndex';
import { filterListings } from './filters/filterListings';
import { useListingStore } from './store/useListingStore';
import { DEFAULT_STYLE_URL } from './config/mapStyle';
import type { Listing } from './types/listing';
import type { BBox, MapEngine } from './types/map';

export interface ListingMapProps {
  listings: Listing[];
  /** Override to point at self-hosted vector tiles. */
  styleUrl?: string;
  onListingSelect?(listing: Listing): void;
  /** Fired by the detail CTA. The consumer owns navigation. */
  onListingOpen?(listing: Listing): void;
  className?: string;
}

export function ListingMap({
  listings,
  styleUrl = DEFAULT_STYLE_URL,
  onListingSelect,
  onListingOpen,
  className = '',
}: ListingMapProps) {
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [errorKind, setErrorKind] = useState<'tile' | 'webgl' | null>(null);

  const index = useSearchIndex(listings);
  const filters = useListingStore((state) => state.filters);
  const residualQuery = useListingStore((state) => state.residualQuery);
  const activeProvince = useListingStore((state) => state.activeProvince);
  const sort = useListingStore((state) => state.sort);
  const selectedId = useListingStore((state) => state.selectedId);
  const hoveredId = useListingStore((state) => state.hoveredId);
  const railOpen = useListingStore((state) => state.railOpen);

  const filtered = useMemo(
    () => filterListings(index, filters, residualQuery, activeProvince, sort),
    [index, filters, residualQuery, activeProvince, sort],
  );

  const selected = useMemo(
    () => filtered.find((listing) => listing.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  // Push highlight state down to the GPU rather than re-rendering anything.
  useEffect(() => { engine?.setSelected(selectedId); }, [engine, selectedId]);
  useEffect(() => { engine?.setHovered(hoveredId); }, [engine, hoveredId]);

  useEffect(() => {
    if (selected && onListingSelect) onListingSelect(selected);
  }, [selected, onListingSelect]);

  const handleFlyTo = useCallback(
    (bbox: BBox) => engine?.flyToBounds(bbox),
    [engine],
  );

  const handleEngineReady = useCallback((next: MapEngine) => setEngine(next), []);
  const handleError = useCallback((kind: 'tile' | 'webgl') => setErrorKind(kind), []);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-surface ${className}`}>
      <MapCanvas
        listings={filtered}
        styleUrl={styleUrl}
        onEngineReady={handleEngineReady}
        onError={handleError}
      />

      {/* Overlay grid. pointer-events-none so the map stays draggable between panels. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3 md:p-4">
        <div className="flex justify-center">
          <SearchBar onFlyTo={handleFlyTo} />
        </div>

        <div className="flex justify-center">
          <FilterBar />
        </div>

        <div className="flex min-h-0 flex-1 items-stretch gap-3">
          {railOpen && (
            <div className="hidden min-h-0 md:block motion-safe:animate-[rail-in_240ms_var(--ease-spring)]">
              <ResultsRail listings={filtered} />
            </div>
          )}

          <div className="flex flex-1 items-start justify-start">
            <RailToggle />
          </div>

          <div className="flex flex-col items-end justify-between gap-3">
            <MapControls engine={engine} />
            {selected && (
              <ListingDetail
                listing={selected}
                onOpen={(listing) => onListingOpen?.(listing)}
              />
            )}
          </div>
        </div>

        {errorKind && (
          <div className="flex justify-center">
            <ErrorNotice kind={errorKind} onDismiss={() => setErrorKind(null)} />
          </div>
        )}
      </div>

      {/* Mobile: the rail becomes a bottom sheet. */}
      {railOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 p-3 md:hidden">
          <ResultsRail listings={filtered} />
        </div>
      )}
    </div>
  );
}
