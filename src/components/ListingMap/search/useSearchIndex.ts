import { useMemo } from 'react';
import { tokenize } from '../lib/normalize';
import { nearestProvince } from './lib/gazetteer';
import type { IndexedListing, Listing } from '../types/listing';

/**
 * Precompute normalized tokens and derived province once per dataset, so the
 * per-keystroke scoring path never touches Intl or string normalization.
 */
export function buildIndex(listings: Listing[]): IndexedListing[] {
  return listings.map((listing) => {
    const titleTokens = tokenize(listing.title);
    const bodyTokens = [
      ...tokenize(listing.subTitle),
      ...tokenize(listing.description),
    ];
    return {
      listing,
      haystack: [...titleTokens, ...bodyTokens].join(' '),
      titleTokens,
      bodyTokens,
      province: nearestProvince(listing.location.lng, listing.location.lat).name,
    };
  });
}

export function useSearchIndex(listings: Listing[]): IndexedListing[] {
  return useMemo(() => buildIndex(listings), [listings]);
}
