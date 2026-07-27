import { ListingMap } from '../components/ListingMap';
import type { Listing } from '../components/ListingMap';
import rawListings from '../data/listings.json';

const listings = rawListings as Listing[];

export default function App() {
  return (
    <div className="h-full w-full">
      <ListingMap
        listings={listings}
        // The dataset's photo host does not resolve. Point this at the CDN that
        // actually serves the files and every card and detail panel picks them
        // up; without it they fall back to category artwork.
        // imageBaseUrl="https://cdn.uyap.gov.tr/ilan"
        onListingOpen={(listing) => window.open(listing.detailUrl, '_blank')}
      />
    </div>
  );
}
