import { useCallback } from 'react';
import { useListingStore } from '../store/useListingStore';
import { FocusViewView } from './FocusViewView';
import type { Listing } from '../types/listing';
import type { MapEngine } from '../types/map';

interface FocusViewProps {
  listing: Listing;
  engine: MapEngine | null;
  /** The map container's pixel size, used to decide if the pin is on screen. */
  size: { width: number; height: number };
  onOpen(listing: Listing): void;
}

/** The full-surface listing view, wired to the surrounding `<ListingMap>`. */
export function FocusView({ listing, engine, size, onOpen }: FocusViewProps) {
  const select = useListingStore((state) => state.select);

  /**
   * Leaving focus mode also returns the camera. Selecting flew the map to a
   * single listing at street zoom; dropping back to the list with the map still
   * there would strand the user somewhere they never navigated to.
   */
  const close = useCallback(() => {
    engine?.resetView();
    select(null);
  }, [engine, select]);

  return (
    <FocusViewView
      listing={listing}
      engine={engine}
      size={size}
      onOpen={onOpen}
      onClose={close}
    />
  );
}
