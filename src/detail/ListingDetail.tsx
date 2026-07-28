import { useListingStore } from '../store/useListingStore';
import { ListingDetailView } from './ListingDetailView';
import type { Listing } from '../types/listing';

export interface ListingDetailProps {
  listing: Listing;
  onOpen(listing: Listing): void;
}

/** The compact panel, wired to the surrounding `<ListingMap>`. */
export function ListingDetail({ listing, onOpen }: ListingDetailProps) {
  const select = useListingStore((state) => state.select);
  return (
    <ListingDetailView
      listing={listing}
      onOpen={onOpen}
      onClose={() => select(null)}
    />
  );
}
