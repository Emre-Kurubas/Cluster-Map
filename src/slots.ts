import type { ComponentType } from 'react';
import type { SearchBarProps } from './search/SearchBar';
import type { ResultsRailProps } from './list/ResultsRail';
import type { MapControlsProps } from './controls/MapControls';
import type { ErrorNoticeProps } from './controls/ErrorNotice';
import type { FocusViewProps } from './detail/FocusView';
import type { ListingDetailProps } from './detail/ListingDetail';

/**
 * One piece of chrome: the default, a replacement, or nothing.
 *
 * `false` rather than `null` for the off case, so an undefined slot — the
 * overwhelmingly common one — can keep meaning "use the default" without a
 * consumer having to spell that out.
 */
export type Slot<P> = ComponentType<P> | false;

/** Components that take no props. */
type NoProps = Record<string, never>;

/**
 * What renders at each position in `<ListingMap>`.
 *
 * A slot is typed by the props its *default* receives, not by the default's
 * `View` props: a replacement is a drop-in for the connected component, and
 * anything else it needs it can read with `useListingStore` from
 * `cluster-map/primitives`. That keeps each contract to what the layout
 * actually hands down — `onFlyTo`, a listing, an engine — rather than freezing
 * the store shape of every panel into the public API.
 *
 * `rail` covers both positions the results list appears in: the desktop rail
 * and the bottom sheet below `md`. They are the same component in two places,
 * not two slots.
 */
export interface ListingMapSlots {
  searchBar?: Slot<SearchBarProps>;
  filterBar?: Slot<NoProps>;
  /** Switching this off also removes `railToggle` — see `ListingMapView`. */
  rail?: Slot<ResultsRailProps>;
  railToggle?: Slot<NoProps>;
  categoryDock?: Slot<NoProps>;
  mapControls?: Slot<MapControlsProps>;
  errorNotice?: Slot<ErrorNoticeProps>;
  focusView?: Slot<FocusViewProps>;
  detail?: Slot<ListingDetailProps>;
}

/**
 * The component to render at a position, or null if nothing should be.
 *
 * A function rather than `slots?.x ?? Default` inline, because `false` and
 * `undefined` are both falsy and mean opposite things — one is "remove this",
 * the other is "I did not say".
 */
export function resolveSlot<P>(
  slot: Slot<P> | undefined,
  fallback: ComponentType<P>,
): ComponentType<P> | null {
  if (slot === false) return null;
  return slot ?? fallback;
}
