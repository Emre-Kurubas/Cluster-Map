import { useEffect, useRef } from 'react';
import { parseQuery } from './lib/parseQuery';
import { useListingStore } from '../store/useListingStore';
import { SEARCH_DEBOUNCE_MS } from '../config/constants';
import type { BBox } from '../types/map';

/**
 * Parse the query after a short pause and push the result into the store.
 *
 * Debouncing here rather than in the input keeps the field perfectly
 * responsive — typing only ever sets a string; parsing and refiltering
 * happen once the user stops.
 */
export function useSmartSearch(onFlyTo: (bbox: BBox) => void): void {
  const query = useListingStore((state) => state.query);
  const applyParsed = useListingStore((state) => state.applyParsed);
  const lastFlyTo = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = parseQuery(query);
      applyParsed(parsed.chips, parsed.residual);

      // Fly once per distinct province, not on every keystroke that still
      // happens to contain the same province name.
      const key = parsed.flyTo ? parsed.flyTo.join(',') : null;
      if (key && key !== lastFlyTo.current) {
        onFlyTo(parsed.flyTo!);
      }
      lastFlyTo.current = key;
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, applyParsed, onFlyTo]);
}
