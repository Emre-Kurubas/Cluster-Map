/**
 * OpenFreeMap "positron" — free, keyless, MapLibre-native vector tiles.
 * Overridable per-instance through the ListingMap `styleUrl` prop so Uyap can
 * point at self-hosted tiles without touching component code.
 */
export const DEFAULT_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

export const SOURCE_ID = 'listings';
export const LAYER_CLUSTERS = 'listing-clusters';
export const LAYER_CLUSTER_COUNT = 'listing-cluster-count';
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
 * Layer ids in the base style whose visibility we mute, so the basemap reads as
 * a quiet backdrop and the pins are the only saturated thing on screen.
 * Missing ids are ignored — base styles change and this must not throw.
 */
export const MUTED_BASE_LAYER_PREFIXES = ['poi', 'aeroway', 'building-3d'];
