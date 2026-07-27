import type { Listing } from '../types/listing';

/**
 * Where a listing's photo actually lives.
 *
 * The dataset ships absolute URLs on a host that does not resolve, so the
 * filename is the only usable part. Consumers point `imageBaseUrl` at the CDN
 * that really serves these files and the same filename is requested from there;
 * without it the listing's own URL is returned unchanged, which keeps the demo
 * on its category-art fallback instead of inventing a host.
 */
export function resolveImageUrl(listing: Listing, imageBaseUrl?: string): string {
  const base = imageBaseUrl?.trim();
  if (!base) return listing.thumbnailUrl ?? '';

  return `${base.replace(/\/+$/, '')}/${filenameFor(listing)}`;
}

/** Last path segment of the listing's own URL, or `<id>.jpg` if it has none. */
function filenameFor(listing: Listing): string {
  const withoutQuery = (listing.thumbnailUrl ?? '').split(/[?#]/)[0];
  const segment = withoutQuery.split('/').filter(Boolean).pop();
  return segment || `${listing.id}.jpg`;
}
