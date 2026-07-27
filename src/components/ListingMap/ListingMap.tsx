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

  // The range slider spans the whole dataset, so this is derived from the
  // incoming listings and not from `filtered` — a domain that shrank as the
  // user dragged would pull the thumb out from under them.
  const setPriceDomain = useListingStore((state) => state.setPriceDomain);
  useEffect(() => {
    if (listings.length === 0) return;
    let min = Infinity;
    let max = -Infinity;
    for (const listing of listings) {
      if (listing.price < min) min = listing.price;
      if (listing.price > max) max = listing.price;
    }
    setPriceDomain(min, max);
  }, [listings, setPriceDomain]);

  const filtered = useMemo(
    () => filterListings(index, filters, residualQuery, activeProvince, sort),
    [index, filters, residualQuery, activeProvince, sort],
  );

  const selected = useMemo(
    () => filtered.find((listing) => listing.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  /**
   * The same listings as `filtered`, restored to the dataset's own order.
   *
   * Sort is a property of the list, not of the map, but MapLibre's clustering
   * is order-dependent: it walks the source features in order and lets the
   * first unclaimed point seed a cluster and take its neighbours. Handing it a
   * price-sorted array therefore redrew the clusters — different groupings,
   * counts and donut colours — for a control that adds and removes nothing.
   *
   * Individual pins were never affected: they set `icon-allow-overlap`, so
   * none are dropped by collision, and their draw order is by viewport-y.
   */
  const datasetRank = useMemo(
    () => new Map(listings.map((listing, position) => [listing.id, position])),
    [listings],
  );

  const mapListings = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => (datasetRank.get(a.id) ?? 0) - (datasetRank.get(b.id) ?? 0),
      ),
    [filtered, datasetRank],
  );

  /**
   * Focus mode. Derived rather than stored, and it never touches `railOpen` —
   * closing the view must restore the rail to whatever the user left it as.
   */
  const focused = selected !== null;

  /**
   * Release a selection the filters have dropped.
   *
   * Because focus mode is derived, filtering the selected listing away closed
   * the view but left `selectedId` set behind it. Lifting the filter then
   * reopened focus mode on its own, unasked — and pointing at wherever the
   * camera had drifted to, because the fly-to effect is keyed on the id, which
   * never changed. A selection that is no longer on the map is not a selection.
   */
  const select = useListingStore((state) => state.select);
  useEffect(() => {
    if (selectedId === null || selected !== null) return;
    select(null);
  }, [selectedId, selected, select]);

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
  // WebGL never comes back within a session; only the tile notice is retractable.
  const handleRecover = useCallback(
    () => setErrorKind((kind) => (kind === 'tile' ? null : kind)),
    [],
  );

  return (
    <ImageBaseUrlProvider value={imageBaseUrl}>
      <div
        ref={rootRef}
        className={`relative h-full w-full overflow-hidden bg-surface ${className}`}
      >
        <MapCanvas
          listings={mapListings}
          styleUrl={styleUrl}
          onEngineReady={handleEngineReady}
          onError={handleError}
          onRecover={handleRecover}
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

              {/* The rail collapses by width rather than unmounting, so the
                  handle beside it slides with the edge instead of teleporting
                  across the map. It keeps its 320px content width while the
                  wrapper clips it — nothing reflows mid-transition — and goes
                  inert when shut so no card is tabbable behind the fold. */}
              <div className="flex min-h-0 flex-1 items-stretch">
                <div
                  id="listing-rail"
                  inert={!railOpen}
                  className={[
                    'hidden h-full min-h-0 overflow-hidden md:block',
                    'transition-[width,opacity] duration-300 ease-[var(--ease-spring)]',
                    railOpen ? 'md:w-80 opacity-100' : 'md:w-0 opacity-0',
                  ].join(' ')}
                >
                  <ResultsRail listings={filtered} />
                </div>

                <RailToggle />
              </div>
            </>
          )}

          {errorKind && (
            <div className="mt-auto flex justify-center">
              <ErrorNotice kind={errorKind} onDismiss={() => setErrorKind(null)} />
            </div>
          )}
        </div>

        {/* Insets match the overlay grid's own padding, so the foot of these
            controls lands on the same line as the foot of the rail. They used
            to sit higher to clear MapLibre's attribution strip; that control is
            gone, and the corner is ours again.

            The legend sits to the left of the zoom stack on a shared baseline,
            so neither one adds height to the corner. Only the legend is chrome,
            so only it goes away in focus mode. */}
        <div
          className="pointer-events-none absolute bottom-3 right-3 flex items-end
                     gap-2 md:bottom-4 md:right-4"
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
