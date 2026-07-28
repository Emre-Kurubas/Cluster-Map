// By its published name, resolved to dist/ by the alias in vite.config.ts —
// so the demo exercises the built package, not the source.
import { ListingMap } from 'cluster-map';
import type { Listing } from 'cluster-map';
import { withDemoPhotos } from './demoPhotos';
import rawListings from './data/listings.json';

// The dataset's own photo host does not resolve, so the demo substitutes
// stand-ins. A real deployment drops this and passes `imageBaseUrl` instead:
//   <ListingMap listings={listings} imageBaseUrl="https://cdn.example.com/listings" />
const listings = withDemoPhotos(rawListings as Listing[]);

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
