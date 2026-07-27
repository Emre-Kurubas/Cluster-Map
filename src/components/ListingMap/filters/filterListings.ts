import { tokenize } from '../lib/normalize';
import { scoreListing } from '../search/lib/fuzzy';
import type { Filters, SortMode } from '../types/filters';
import type { IndexedListing, Listing } from '../types/listing';

/**
 * Apply every active filter as an intersection, then sort.
 *
 * An empty `categories` or `saleTypes` array means the filter is off. The
 * residual query is scored fuzzily; listings that score 0 are excluded.
 */
export function filterListings(
  index: IndexedListing[],
  filters: Filters,
  residual: string,
  province: string | null,
  sort: SortMode,
): Listing[] {
  const queryTokens = tokenize(residual);
  const scored: Array<{ listing: Listing; score: number }> = [];

  for (const entry of index) {
    const { listing } = entry;

    if (filters.categories.length > 0 && !filters.categories.includes(listing.category)) {
      continue;
    }
    if (filters.saleTypes.length > 0 && !filters.saleTypes.includes(listing.saleType)) {
      continue;
    }
    if (filters.priceMin !== null && listing.price < filters.priceMin) continue;
    if (filters.priceMax !== null && listing.price > filters.priceMax) continue;
    if (province !== null && entry.province !== province) continue;

    let score = 0;
    if (queryTokens.length > 0) {
      score = scoreListing(entry, queryTokens);
      if (score === 0) continue;
    }

    scored.push({ listing, score });
  }

  if (sort === 'price-asc') {
    scored.sort((a, b) => a.listing.price - b.listing.price);
  } else if (sort === 'price-desc') {
    scored.sort((a, b) => b.listing.price - a.listing.price);
  } else if (queryTokens.length > 0) {
    scored.sort((a, b) => b.score - a.score || a.listing.price - b.listing.price);
  }

  return scored.map((entry) => entry.listing);
}
