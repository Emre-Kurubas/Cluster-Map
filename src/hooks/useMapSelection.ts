import { useEffect } from 'react';
import { useListingStore, useListingStoreApi } from '../store/useListingStore';
import { FOCUS_FLY_OFFSET, LISTING_FLY_ZOOM } from '../config/constants';
import type { Listing } from '../types/listing';
import type { MapEngine } from '../types/map';

/**
 * Everything that happens between a selection and the map.
 *
 * Four separate concerns, kept together because they all key off the same
 * selection and reading them apart would hide how they interact.
 */
export function useMapSelection(
  engine: MapEngine | null,
  selected: Listing | null,
  onListingSelect?: (listing: Listing) => void,
): void {
  const selectedId = useListingStore((state) => state.selectedId);
  const select = useListingStore((state) => state.select);
  // Not a subscription. See the hover effect below.
  const storeApi = useListingStoreApi();

  /**
   * Release a selection the filters have dropped.
   *
   * Because focus mode is derived, filtering the selected listing away closed
   * the view but left `selectedId` set behind it. Lifting the filter then
   * reopened focus mode on its own, unasked — and pointing at wherever the
   * camera had drifted to, because the fly-to effect is keyed on the id, which
   * never changed. A selection that is no longer on the map is not a selection.
   */
  useEffect(() => {
    if (selectedId === null || selected !== null) return;
    select(null);
  }, [selectedId, selected, select]);

  // Push highlight state down to the GPU rather than re-rendering anything.
  useEffect(() => { engine?.setSelected(selectedId); }, [engine, selectedId]);

  /**
   * Hover goes straight from the store to the engine, around React entirely.
   *
   * It used to be a subscribed slice, so every pin-to-pin transition re-rendered
   * the whole view — the rail, the filters, the focus view — purely to hand an
   * id back to the engine that had raised it a moment earlier. Nothing renders
   * differently for a hovered pin; the highlight is a layer filter.
   *
   * Selection keeps its subscription above, because focus mode genuinely
   * depends on which listing is selected.
   */
  useEffect(() => {
    if (!engine) return undefined;

    engine.setHovered(storeApi.getState().hoveredId);

    let previous = storeApi.getState().hoveredId;
    return storeApi.subscribe(() => {
      const next = storeApi.getState().hoveredId;
      if (next === previous) return;
      previous = next;
      engine.setHovered(next);
    });
  }, [engine, storeApi]);

  useEffect(() => {
    if (selected && onListingSelect) onListingSelect(selected);
  }, [selected, onListingSelect]);

  /**
   * Fly to whatever becomes selected, wherever the selection came from, so a
   * pin click on the map behaves exactly like a rail card click. The offset
   * lands the pin right of centre, clear of the circle and the details column.
   *
   * Keyed on the id alone: re-renders of the same listing must not re-fly.
   */
  const selectedLocation = selected?.location;
  useEffect(() => {
    if (!engine || !selectedLocation) return;
    engine.flyToPoint(
      [selectedLocation.lng, selectedLocation.lat],
      LISTING_FLY_ZOOM,
      FOCUS_FLY_OFFSET,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, selectedId]);
}
