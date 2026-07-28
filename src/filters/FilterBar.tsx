import { useListingStore } from '../store/useListingStore';
import { FilterBarView } from './FilterBarView';
import { FilterPanel } from './FilterPanel';

/** The filter disclosure, wired to the surrounding `<ListingMap>`. */
export function FilterBar() {
  const filters = useListingStore((state) => state.filters);

  // Categories count whichever way they were narrowed — a query chip that
  // included one, or a legend row that crossed one out.
  const activeCount =
    filters.categories.length +
    filters.hiddenCategories.length +
    (filters.priceMin !== null || filters.priceMax !== null ? 1 : 0);

  return (
    <FilterBarView activeCount={activeCount}>
      <FilterPanel hasActiveFilter={activeCount > 0} />
    </FilterBarView>
  );
}
