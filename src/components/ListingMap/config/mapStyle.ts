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
export const LAYER_PIN_LABELS = 'listing-pin-labels';

/**
 * Layer ids in the base style whose visibility we mute, so the basemap reads as
 * a quiet backdrop and the pins are the only saturated thing on screen.
 * Missing ids are ignored — base styles change and this must not throw.
 */
export const MUTED_BASE_LAYER_PREFIXES = ['poi', 'aeroway', 'building-3d'];
