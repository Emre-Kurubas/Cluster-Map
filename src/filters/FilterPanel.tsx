import { useListingStore } from '../store/useListingStore';
import { FilterPanelView } from './FilterPanelView';

/** Wires the panel to the surrounding `<ListingMap>`. */
export function FilterPanel({ hasActiveFilter }: { hasActiveFilter: boolean }) {
  const priceMin = useListingStore((state) => state.filters.priceMin);
  const priceMax = useListingStore((state) => state.filters.priceMax);
  const domain = useListingStore((state) => state.priceDomain);
  const setPriceRange = useListingStore((state) => state.setPriceRange);
  const sort = useListingStore((state) => state.sort);
  const setSort = useListingStore((state) => state.setSort);
  const resetAll = useListingStore((state) => state.resetAll);

  return (
    <FilterPanelView
      priceMin={priceMin}
      priceMax={priceMax}
      domain={domain}
      onPriceChange={setPriceRange}
      sort={sort}
      onSortChange={setSort}
      hasActiveFilter={hasActiveFilter}
      onReset={resetAll}
    />
  );
}
