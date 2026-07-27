import { useCallback, useRef, useState } from 'react';
import { MapCanvasLazy } from './map/MapCanvasLazy';
import { SearchBar } from './search/SearchBar';
import { FilterBar } from './filters/FilterBar';
import { ResultsRail } from './list/ResultsRail';
import { ListingDetail } from './detail/ListingDetail';
import { FocusView } from './detail/FocusView';
import { MapControls } from './controls/MapControls';
import { CategoryDock } from './controls/CategoryDock';
import { RailToggle } from './controls/RailToggle';
import { ErrorNotice } from './controls/ErrorNotice';
import { useFilteredListings } from './hooks/useFilteredListings';
import { useContainerSize } from './hooks/useContainerSize';
import { useMapSelection } from './hooks/useMapSelection';
import { useListingStore } from './store/useListingStore';
import { DEFAULT_STYLE_URL } from './config/mapStyle';
import type { ListingMapProps } from './ListingMap';
import type { BBox, MapEngine } from './types/map';

/** Everything `ListingMap` passes down. It owns `imageBaseUrl` itself. */
export type ListingMapViewProps = Omit<ListingMapProps, 'imageBaseUrl'>;

/**
 * The map itself, rendered inside the store and image-base-url providers that
 * `ListingMap` mounts.
 *
 * Split out because a component cannot consume a context it provides, and this
 * one reads the store seven times over.
 */
export function ListingMapView({
  listings,
  styleUrl = DEFAULT_STYLE_URL,
  onListingSelect,
  onListingOpen,
  className = '',
}: ListingMapViewProps) {
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const [errorKind, setErrorKind] = useState<'tile' | 'webgl' | null>(null);

  const railOpen = useListingStore((state) => state.railOpen);
  const { filtered, mapListings, selected } = useFilteredListings(listings);

  /**
   * Focus mode. Derived rather than stored, and it never touches `railOpen` —
   * closing the view must restore the rail to whatever the user left it as.
   */
  const focused = selected !== null;

  // The focus view's connector needs the container's pixel size to decide
  // whether the pin is still on screen.
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);

  useMapSelection(engine, selected, onListingSelect);

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

  // `uyap-listing-map` on the root is the package's style scope: the published
  // stylesheet emits every rule beneath it, so nothing leaks onto a host page
  // and nothing on a host page collides with us.
  return (
    <div
      ref={rootRef}
      className={`uyap-listing-map relative h-full w-full overflow-hidden bg-surface ${className}`}
    >
      <MapCanvasLazy
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
  );
}
