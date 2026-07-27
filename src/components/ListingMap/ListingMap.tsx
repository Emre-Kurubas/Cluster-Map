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
import { ImageBaseUrlProvider } from './lib/imageBaseUrl';
import { DEFAULT_STYLE_URL } from './config/mapStyle';
import { LISTING_FLY_ZOOM } from './config/constants';
import type { Listing } from './types/listing';
import type { BBox, MapEngine } from './types/map';

export interface ListingMapProps {
  listings: Listing[];
  /** Override to point at self-hosted vector tiles. */
  styleUrl?: string;
  /**
   * CDN root that serves listing photos, e.g. `https://cdn.uyap.gov.tr/ilan`.
   * Each listing's own filename is requested from there. Without it the
   * dataset's URLs are used as-is — they resolve to nothing, so cards and the
   * detail panel fall back to category artwork.
   */
  imageBaseUrl?: string;
  onListingSelect?(listing: Listing): void;
  /** Fired by the detail CTA. The consumer owns navigation. */
  onListingOpen?(listing: Listing): void;
  className?: string;
}

export function ListingMap({
  listings,
  styleUrl = DEFAULT_STYLE_URL,
  imageBaseUrl,
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

  /** A card was chosen from the list, so bring the map to it. */
  const handleFocusListing = useCallback(
    (listing: Listing) =>
      engine?.flyToPoint(
        [listing.location.lng, listing.location.lat],
        LISTING_FLY_ZOOM,
      ),
    [engine],
  );

  const handleEngineReady = useCallback((next: MapEngine) => setEngine(next), []);
  const handleError = useCallback((kind: 'tile' | 'webgl') => setErrorKind(kind), []);

  return (
    <ImageBaseUrlProvider value={imageBaseUrl}>
      <div className={`relative h-full w-full overflow-hidden bg-surface ${className}`}>
        <MapCanvas
          listings={filtered}
          styleUrl={styleUrl}
          onEngineReady={handleEngineReady}
          onError={handleError}
        />

        {/* Overlay grid. pointer-events-none so the map stays draggable between panels. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3 md:p-4">
          {/* Search and the filter disclosure share one row. */}
          <div className="mx-auto flex w-full max-w-3xl items-start gap-2">
            <SearchBar onFlyTo={handleFlyTo} />
            <FilterBar />
          </div>

          <div className="flex min-h-0 flex-1 items-start gap-3">
            {railOpen && (
              <div className="hidden h-full min-h-0 md:block motion-safe:animate-[rail-in_240ms_var(--ease-spring)]">
                <ResultsRail listings={filtered} onFocus={handleFocusListing} />
              </div>
            )}

            <div className="flex flex-1 items-start justify-start">
              <RailToggle />
            </div>

            {/* Detail sits at the top of the right column, clear of the controls. */}
            {selected && (
              <ListingDetail
                listing={selected}
                onOpen={(listing) => onListingOpen?.(listing)}
              />
            )}
          </div>

          {errorKind && (
            <div className="flex justify-center">
              <ErrorNotice kind={errorKind} onDismiss={() => setErrorKind(null)} />
            </div>
          )}
        </div>

        {/* Zoom and reset, pinned bottom right, clear of MapLibre's attribution
            strip — which sits in that same corner and is not ours to move. */}
        <div className="absolute bottom-8 right-3 md:bottom-10 md:right-4">
          <MapControls engine={engine} />
        </div>

        {/* Mobile: the rail becomes a bottom sheet. */}
        {railOpen && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 p-3 md:hidden">
            <ResultsRail listings={filtered} onFocus={handleFocusListing} />
          </div>
        )}
      </div>
    </ImageBaseUrlProvider>
  );
}
