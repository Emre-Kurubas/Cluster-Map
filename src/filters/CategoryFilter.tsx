import { useListingStore } from '../store/useListingStore';
import { CategoryFilterView } from './CategoryFilterView';

/** Reads the legend's exclusions from the surrounding `<ListingMap>`. */
export function CategoryFilter() {
  const hidden = useListingStore((state) => state.filters.hiddenCategories);
  const toggle = useListingStore((state) => state.toggleCategoryVisibility);
  return <CategoryFilterView hidden={hidden} onToggle={toggle} />;
}
