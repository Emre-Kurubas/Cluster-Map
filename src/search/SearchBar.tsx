import { useSmartSearch } from './useSmartSearch';
import { useListingStore } from '../store/useListingStore';
import { SearchBarView } from './SearchBarView';
import type { BBox } from '../types/map';

interface SearchBarProps {
  onFlyTo(bbox: BBox): void;
}

/** The search field, wired to the surrounding `<ListingMap>`. */
export function SearchBar({ onFlyTo }: SearchBarProps) {
  useSmartSearch(onFlyTo);

  const query = useListingStore((state) => state.query);
  const chips = useListingStore((state) => state.chips);
  const setQuery = useListingStore((state) => state.setQuery);
  const removeChip = useListingStore((state) => state.removeChip);
  // Not resetAll: this button says "Aramayı temizle", and the price range,
  // legend exclusions and sort mode are not part of the search.
  const clearSearch = useListingStore((state) => state.clearSearch);

  return (
    <SearchBarView
      query={query}
      chips={chips}
      onQueryChange={setQuery}
      onRemoveChip={removeChip}
      onClear={clearSearch}
    />
  );
}
