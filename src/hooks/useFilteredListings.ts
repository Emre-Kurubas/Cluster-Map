import { useEffect, useMemo } from 'react';
import { useSearchIndex } from '../search/useSearchIndex';
import { filterListings } from '../filters/filterListings';
import { useListingStore } from '../store/useListingStore';
import type { Listing } from '../types/listing';

export interface FilteredListings {
  /** Filtered and sorted, in the order the rail should show them. */
  filtered: Listing[];
  /** The same listings, restored to the dataset's own order, for the map. */
  mapListings: Listing[];
  /** The selected listing, or null if nothing is selected or it was filtered away. */
  selected: Listing | null;
}

/**
 * Everything derived from the incoming listings plus the current filters.
 *
 * Also owns the price domain, because that is derived from the same input: the
 * range slider spans the whole dataset rather than `filtered`, since a domain
 * that shrank as the user dragged would pull the thumb out from under them.
 */
export function useFilteredListings(listings: Listing[]): FilteredListings {
  const index = useSearchIndex(listings);
  const filters = useListingStore((state) => state.filters);
  const residualQuery = useListingStore((state) => state.residualQuery);
  const activeProvince = useListingStore((state) => state.activeProvince);
  const sort = useListingStore((state) => state.sort);
  const selectedId = useListingStore((state) => state.selectedId);
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

  return { filtered, mapListings, selected };
}
