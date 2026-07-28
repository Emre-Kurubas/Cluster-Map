import { useState } from 'react';
import { ListingMapView } from './ListingMapView';
import { createListingStore } from './store/createListingStore';
import { ListingStoreProvider } from './store/ListingStoreContext';
import { ImageBaseUrlProvider } from './lib/imageBaseUrl';
import type { Listing } from './types/listing';

export interface ListingMapProps {
  listings: Listing[];
  /** Override to point at self-hosted vector tiles. */
  styleUrl?: string;
  /**
   * CDN root that serves listing photos, e.g. `https://cdn.uyap.gov.tr/ilan`.
   * Each listing's own filename is requested from there. Without it the
   * dataset's URLs are used as-is — they resolve to nothing, so cards and the
   * detail panel fall back to category artwork.
   */
  imageBaseUrl?: string;
  onListingSelect?(listing: Listing): void;
  /** Fired by the detail CTA. The consumer owns navigation. */
  onListingOpen?(listing: Listing): void;
  className?: string;
}

/**
 * An interactive map of İcra auction listings.
 *
 * Thin by design: it exists to own the two providers the tree below it reads
 * from. A component cannot consume a context it provides, and `ListingMapView`
 * reads the store seven times over — hence the split.
 *
 * The store is created per instance, so two maps on one page keep independent
 * filters, and remounting one starts it clean rather than restoring whatever
 * the last mount was left filtering by.
 */
export function ListingMap({ imageBaseUrl, ...view }: ListingMapProps) {
  // Lazy initialiser: one store for the life of this instance. Passing
  // `createListingStore()` directly would build a fresh store on every render
  // and throw the previous one — and the user's filters — away.
  const [store] = useState(createListingStore);

  return (
    <ListingStoreProvider store={store}>
      <ImageBaseUrlProvider value={imageBaseUrl}>
        <ListingMapView {...view} />
      </ImageBaseUrlProvider>
    </ListingStoreProvider>
  );
}
