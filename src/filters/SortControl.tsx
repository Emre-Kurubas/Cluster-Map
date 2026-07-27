import { useListingStore } from '../store/useListingStore';
import { SortControlView } from './SortControlView';

/** Reads the sort mode from the surrounding `<ListingMap>`. */
export function SortControl() {
  const sort = useListingStore((state) => state.sort);
  const setSort = useListingStore((state) => state.setSort);
  return <SortControlView sort={sort} onChange={setSort} />;
}
