/**
 * OpenFreeMap "positron" — free, keyless, MapLibre-native vector tiles.
 * Overridable per-instance through the ListingMap `styleUrl` prop so a consumer can
 * point at self-hosted tiles without touching component code.
 */
export const DEFAULT_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

export const SOURCE_ID = 'listings';
/** Donut ring and its count — one symbol layer, so they place together. */
export const LAYER_CLUSTERS = 'listing-clusters';
/**
 * Enlarged copy of the cluster layer, drawn above it and filtered to the
 * cluster under the pointer. Same reason the pins need their own highlight
 * layer: `icon-size` is a layout property, so it cannot read feature-state.
 */
export const LAYER_CLUSTERS_ACTIVE = 'listing-clusters-active';
export const LAYER_PINS = 'listing-pins';
/**
 * Draws the hovered/selected pins enlarged, on top of the base pin layer.
 *
 * A separate layer is required rather than scaling in place: `icon-size` is a
 * layout property, and MapLibre rejects `feature-state` expressions in layout
 * properties outright. Highlighting is therefore driven by `setFilter` on this
 * layer, which is just as cheap and needs no source re-upload.
 */
export const LAYER_PINS_ACTIVE = 'listing-pins-active';
export const LAYER_PIN_LABELS = 'listing-pin-labels';

/**
 * Base-style layers we hide, so the basemap reads as a quiet backdrop and the
 * pins are the only saturated thing on screen. Matched by prefix; ids that no
 * style contains are simply never matched, because base styles change and this
 * must not throw.
 *
 * The road shields are here for a second reason. Positron filters them with
 * `["<=", ["get", "ref_length"], 6]`, and `ref_length` is null on every road
 * without a `ref` — so MapLibre's worker logs "Expected value to be of type
 * number, but found null instead" for each one, on every tile, forever. That is
 * an upstream bug in the style and not ours to patch, but hiding the layers
 * stops the worker parsing them at all (`worker_tile` skips hidden layers
 * before populating), which silences it. They are US highway shields on a map
 * of Türkiye; the only one that could ever draw here is `highway-shield-non-us`
 * and it needs a `ref` positron's own filter then fails to read.
 */
export const MUTED_BASE_LAYER_PREFIXES = [
  'poi',
  'aeroway',
  'building-3d',
  'highway-shield',
  'road_shield',
];

/** Whether a base-style layer id is one we hide. */
export function isMutedBaseLayer(id: string): boolean {
  return MUTED_BASE_LAYER_PREFIXES.some((prefix) => id.startsWith(prefix));
}
