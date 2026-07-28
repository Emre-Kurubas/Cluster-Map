import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GlassPanel } from '../ui/GlassPanel';
import { ListingCard } from './ListingCard';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';

const ROW_HEIGHT = 96;

export interface ResultsRailViewProps {
  /** Already filtered and sorted; this preserves the order it is given. */
  listings: Listing[];
  /** Ids inside the current viewport. The rail shows the intersection. */
  visibleIds: number[];
  selectedId: number | null;
  onSelect(id: number): void;
  onHover(id: number | null): void;
  onReset(): void;
}

/**
 * Shows exactly what the map is currently rendering.
 *
 * `listings` arrives already filtered and sorted; this component intersects it
 * with the viewport ids and preserves the incoming order, so the sort control
 * stays authoritative.
 */
export function ResultsRailView({
  listings, visibleIds, selectedId, onSelect, onHover, onReset,
}: ResultsRailViewProps) {
  const visible = useMemo(() => {
    const allowed = new Set(visibleIds);
    return listings.filter((listing) => allowed.has(listing.id));
  }, [listings, visibleIds]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  return (
    <GlassPanel className="pointer-events-auto flex h-full w-full flex-col overflow-hidden md:w-80">
      <div className="border-b border-line/70 px-4 py-3">
        <p className="text-sm font-semibold text-ink-900" aria-live="polite">
          {t.resultCount(visible.length)}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-ink-900">{t.noResults}</p>
          <p className="text-xs text-ink-300">{t.noResultsHint}</p>
          <button
            type="button"
            onClick={onReset}
            className="mt-1 rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium
                       text-white transition-transform duration-200
                       ease-[var(--ease-spring)] hover:bg-brand-900 active:scale-95
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-brand-500"
          >
            {t.clearFilters}
          </button>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((row) => {
              const listing = visible[row.index];
              return (
                <div
                  key={listing.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${row.start}px)`,
                    padding: '0 0 8px',
                  }}
                >
                  <ListingCard
                    listing={listing}
                    selected={listing.id === selectedId}
                    onSelect={onSelect}
                    onHover={onHover}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
