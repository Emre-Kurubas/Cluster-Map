import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapCanvas } from './map/MapCanvas';
import { SearchBar } from './search/SearchBar';
import { FilterBar } from './filters/FilterBar';
import { ResultsRail } from './list/ResultsRail';
import { ListingDetail } from './detail/ListingDetail';
import { FocusView } from './detail/FocusView';
import { MapControls } from './controls/MapControls';
import { CategoryDock } from './controls/CategoryDock';
import { RailToggle } from './controls/RailToggle';
import { ErrorNotice } from './controls/ErrorNotice';
import { useSearchIndex } from './search/useSearchIndex';
import { filterListings } from './filters/filterListings';
import { useListingStore } from './store/useListingStore';
import { ImageBaseUrlProvider } from './lib/imageBaseUrl';
import { DEFAULT_STYLE_URL } from './config/mapStyle';
import { FOCUS_FLY_OFFSET, LISTING_FLY_ZOOM } from './config/constants';
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

  /**
   * Focus mode. Derived rather than stored, and it never touches `railOpen` —
   * closing the view must restore the rail to whatever the user left it as.
   */
  const focused = selected !== null;

  // The focus view's connector needs the container's pixel size to decide
  // whether the pin is still on screen.
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Push highlight state down to the GPU rather than re-rendering anything.
  useEffect(() => { engine?.setSelected(selectedId); }, [engine, selectedId]);
  useEffect(() => { engine?.setHovered(hoveredId); }, [engine, hoveredId]);

  useEffect(() => {
    if (selected && onListingSelect) onListingSelect(selected);
  }, [selected, onListingSelect]);

  /**
   * Fly to whatever becomes selected, wherever the selection came from, so a
   * pin click on the map behaves exactly like a rail card click. The offset
   * lands the pin right of centre, clear of the circle and the details column.
   *
   * Keyed on the id alone: re-renders of the same listing must not re-fly.
   */
  const selectedLocation = selected?.location;
  useEffect(() => {
    if (!engine || !selectedLocation) return;
    engine.flyToPoint(
      [selectedLocation.lng, selectedLocation.lat],
      LISTING_FLY_ZOOM,
      FOCUS_FLY_OFFSET,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, selectedId]);

  const handleFlyTo = useCallback(
    (bbox: BBox) => engine?.flyToBounds(bbox),
    [engine],
  );

  const handleEngineReady = useCallback((next: MapEngine) => setEngine(next), []);
  const handleError = useCallback((kind: 'tile' | 'webgl') => setErrorKind(kind), []);

  return (
    <ImageBaseUrlProvider value={imageBaseUrl}>
      <div
        ref={rootRef}
        className={`relative h-full w-full overflow-hidden bg-surface ${className}`}
      >
        <MapCanvas
          listings={filtered}
          styleUrl={styleUrl}
          onEngineReady={handleEngineReady}
          onError={handleError}
        />

        {/* Overlay grid. pointer-events-none so the map stays draggable between panels. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3 md:p-4">
          {/* Chrome clears away in focus mode so the listing owns the surface. */}
          {!focused && (
            <>
              <div
                className="mx-auto flex w-full max-w-3xl items-start gap-2
                           motion-safe:animate-[chrome-in_150ms_var(--ease-spring)]"
              >
                <SearchBar onFlyTo={handleFlyTo} />
                <FilterBar />
              </div>

              <div className="flex min-h-0 flex-1 items-start gap-3">
                {railOpen && (
                  <div className="hidden h-full min-h-0 md:block motion-safe:animate-[rail-in_240ms_var(--ease-spring)]">
                    <ResultsRail listings={filtered} />
                  </div>
                )}

                <div className="flex flex-1 items-start justify-start">
                  <RailToggle />
                </div>
              </div>
            </>
          )}

          {errorKind && (
            <div className="mt-auto flex justify-center">
              <ErrorNotice kind={errorKind} onDismiss={() => setErrorKind(null)} />
            </div>
          )}
        </div>

        {/* Bottom right, clear of MapLibre's attribution strip — which sits in
            that same corner and is not ours to move. The category legend stacks
            above the zoom controls; only the legend is chrome, so only it goes
            away in focus mode. */}
        <div
          className="pointer-events-none absolute bottom-8 right-3 flex flex-col
                     items-end gap-2 md:bottom-10 md:right-4"
        >
          {!focused && <CategoryDock />}
          <MapControls engine={engine} />
        </div>

        {/* Desktop focus view. */}
        {selected && (
          <div className="hidden md:block">
            <FocusView
              listing={selected}
              engine={engine}
              size={size}
              onOpen={(listing) => onListingOpen?.(listing)}
            />
          </div>
        )}

        {/* Below md the original panel is unchanged. */}
        {selected && (
          <div className="pointer-events-none absolute right-3 top-3 md:hidden">
            <ListingDetail
              listing={selected}
              onOpen={(listing) => onListingOpen?.(listing)}
            />
          </div>
        )}

        {/* Mobile: the rail becomes a bottom sheet. */}
        {railOpen && !focused && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 p-3 md:hidden">
            <ResultsRail listings={filtered} />
          </div>
        )}
      </div>
    </ImageBaseUrlProvider>
  );
}
