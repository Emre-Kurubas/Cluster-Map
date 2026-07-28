import { useListingStore } from '../store/useListingStore';
import { RailToggleView } from './RailToggleView';

/** The rail handle, wired to the surrounding `<ListingMap>`. */
export function RailToggle() {
  const railOpen = useListingStore((state) => state.railOpen);
  const toggleRail = useListingStore((state) => state.toggleRail);
  return <RailToggleView open={railOpen} onToggle={toggleRail} />;
}
