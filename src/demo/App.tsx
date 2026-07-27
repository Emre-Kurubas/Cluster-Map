import { ListingMap } from '../components/ListingMap';
import type { Listing } from '../components/ListingMap';
import rawListings from '../data/listings.json';

const listings = rawListings as Listing[];

export default function App() {
  return (
    <div className="h-full w-full">
      <ListingMap
        listings={listings}
        onListingOpen={(listing) => window.open(listing.detailUrl, '_blank')}
      />
    </div>
  );
}
