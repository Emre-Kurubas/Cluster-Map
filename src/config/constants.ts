import type { BBox } from '../types/map';

/** Türkiye bounds with a small margin, derived from the dataset extent. */
export const TURKEY_BBOX: BBox = [25.5, 35.6, 45.0, 42.5];

export const CLUSTER_RADIUS = 55;
export const CLUSTER_MAX_ZOOM = 12;

export const SEARCH_DEBOUNCE_MS = 120;
export const PROVINCE_FLY_ZOOM = 9;
/** Street level: close enough to see the parcel, wide enough to keep context. */
export const LISTING_FLY_ZOOM = 15;

export const MIN_ZOOM = 4;
export const MAX_ZOOM = 17;

/**
 * How long a symbol takes to fade in when it appears, or out when it goes.
 *
 * This is the entire appear/disappear animation for clusters and pins, and it
 * is not one this component could write for itself: MapLibre carries an opacity
 * per symbol *instance* across tiles, so a cluster that survives a zoom holds
 * steady while only the ones that split dissolve and only their replacements
 * fade up. Nothing outside the placement pass knows which of those a symbol is,
 * so a transition of ours on `icon-opacity` would address the whole layer and
 * blink every cluster on screen for the sake of the two that changed.
 *
 * The number is bounded from both sides, and neither bound is arbitrary:
 *
 * - Below roughly 200ms the dissolve stops registering. 150ms was tried and was
 *   indistinguishable from the hard swap it replaced.
 * - Above it the cost is more than a longer dissolve. MapLibre defers the
 *   placement that would draw the new symbols while the previous one is
 *   `stillRecent`, so a zoom whose tiles arrive after the camera has already
 *   stopped waits out a further fade before anything moves. That is read out of
 *   `Style._updatePlacement`, not measured here — take it as a reason to stay
 *   near the low end rather than as a budget to spend.
 *
 * 300ms is MapLibre's own default and sits inside both. It was 0 here for a
 * while, after a cluster click was measured taking about a second to resolve —
 * but the bulk of that was an SVG decode stalling tile parse, fixed separately
 * by `warmDonutSprites`. Zeroing the fade was treating the wrong half.
 */
export const SYMBOL_FADE_MS = 300;

/**
 * Pixels to push the selected listing right of centre, so its pin clears the
 * focus view's circle and details column.
 */
export const FOCUS_FLY_OFFSET: [number, number] = [220, 0];
