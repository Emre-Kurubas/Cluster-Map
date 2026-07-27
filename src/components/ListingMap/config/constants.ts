import type { BBox } from '../types/map';

/** Türkiye bounds with a small margin, derived from the dataset extent. */
export const TURKEY_BBOX: BBox = [25.5, 35.6, 45.0, 42.5];

export const CLUSTER_RADIUS = 55;
export const CLUSTER_MAX_ZOOM = 12;

export const SEARCH_DEBOUNCE_MS = 120;
export const PROVINCE_FLY_ZOOM = 9;

export const MIN_ZOOM = 4;
export const MAX_ZOOM = 17;
