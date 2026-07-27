import { nearestProvince } from '../search/lib/gazetteer';
import type { Listing } from '../types/listing';

interface FocusHeaderProps {
  listing: Listing;
}

/**
 * The address, centred at the top of the focus view.
 *
 * Deliberately has no background plate — legibility over arbitrary map tiles
 * comes from a text shadow instead, so the map reads as one continuous surface.
 */
export function FocusHeader({ listing }: FocusHeaderProps) {
  const address =
    listing.address?.trim() ||
    nearestProvince(listing.location.lng, listing.location.lat).name;

  return (
    <p
      className="pointer-events-none select-none text-center text-lg font-semibold
                 tracking-tight text-ink-900 xl:text-xl
                 motion-safe:animate-[header-in_250ms_var(--ease-spring)]"
      style={{
        textShadow:
          '0 1px 4px rgb(255 255 255 / 0.95), 0 0 14px rgb(255 255 255 / 0.75)',
      }}
    >
      {address}
    </p>
  );
}
