import { useCallback } from 'react';
import { useListingStore } from '../store/useListingStore';
import { ResultsRailView } from './ResultsRailView';
import type { Listing } from '../types/listing';

interface ResultsRailProps {
  listings: Listing[];
  /**
   * Called with the listing behind a clicked card, in addition to selecting it.
   * The map uses this to fly there; a pin clicked on the map goes through
   * `select` alone and so never moves the view out from under the pointer.
   */
  onFocus?(listing: Listing): void;
}

/** The rail, wired to the surrounding `<ListingMap>`. */
export function ResultsRail({ listings, onFocus }: ResultsRailProps) {
  const visibleIds = useListingStore((state) => state.visibleIds);
  const selectedId = useListingStore((state) => state.selectedId);
  const select = useListingStore((state) => state.select);
  const hover = useListingStore((state) => state.hover);
  const resetAll = useListingStore((state) => state.resetAll);

  // Stable so ListingCard's memoization survives every viewport change.
  const handleSelect = useCallback(
    (id: number) => {
      select(id);
      const listing = listings.find((candidate) => candidate.id === id);
      if (listing) onFocus?.(listing);
    },
    [listings, onFocus, select],
  );

  return (
    <ResultsRailView
      listings={listings}
      visibleIds={visibleIds}
      selectedId={selectedId}
      onSelect={handleSelect}
      onHover={hover}
      onReset={resetAll}
    />
  );
}
