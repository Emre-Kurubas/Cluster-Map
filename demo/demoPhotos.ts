import { getCategoryConfig } from 'cluster-map/primitives';
import type { Listing } from 'cluster-map';

/**
 * Photos per category, so the same listing always shows the same picture and
 * a category reads as a recognisable set rather than 54 unrelated images.
 */
const POOL_SIZE = 12;

/**
 * Points every listing at a stand-in photo.
 *
 * Demo-only. The dataset's `thumbnailUrl` host is a placeholder and does not
 * resolve, so without this every card and the focus view fall back to category
 * artwork and the layout cannot be judged. Real deployments pass `imageBaseUrl`
 * instead and never call this.
 *
 * Picsum serves a stable image per seed but has no notion of subject, so these
 * are arbitrary photographs, not pictures of land, buildings or vehicles. They
 * exist to fill the frame. Swap the URL for a topic-aware host if the demo ever
 * needs to look plausible rather than merely populated.
 */
export function withDemoPhotos(listings: Listing[]): Listing[] {
  return listings.map((listing) => {
    // iconId is the ASCII form of the category — 'Araç' is not URL-safe.
    const pool = getCategoryConfig(listing.category).iconId;
    const slot = listing.id % POOL_SIZE;
    return {
      ...listing,
      thumbnailUrl: `https://picsum.photos/seed/${pool}-${slot}/800/600`,
    };
  });
}
