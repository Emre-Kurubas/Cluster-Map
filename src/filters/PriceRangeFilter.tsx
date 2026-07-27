import { useListingStore } from '../store/useListingStore';
import { PriceRangeFilterView } from './PriceRangeFilterView';

// Re-exported so the existing suite, and anything else reaching for the step
// maths, keeps its import path.
export { niceStep } from './PriceRangeFilterView';

/** Reads the price bounds and the dataset's extent from the surrounding map. */
export function PriceRangeFilter() {
  const priceMin = useListingStore((state) => state.filters.priceMin);
  const priceMax = useListingStore((state) => state.filters.priceMax);
  const domain = useListingStore((state) => state.priceDomain);
  const setPriceRange = useListingStore((state) => state.setPriceRange);

  return (
    <PriceRangeFilterView
      priceMin={priceMin}
      priceMax={priceMax}
      domain={domain}
      onChange={setPriceRange}
    />
  );
}
