import type { Listing } from './listing';

/** [west, south, east, north] */
export type BBox = [number, number, number, number];
/** [lng, lat] */
export type LngLat = [number, number];

export interface MapEngine {
  setData(listings: Listing[]): void;
  flyToBounds(bbox: BBox): void;
  flyToPoint(center: LngLat, zoom: number): void;
  queryVisibleIds(): number[];
  setHovered(id: number | null): void;
  setSelected(id: number | null): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  /** Returns an unsubscribe function. */
  onIdle(cb: () => void): () => void;
  onFeatureClick(cb: (id: number) => void): () => void;
  onClusterClick(cb: (clusterId: number, center: LngLat) => void): () => void;
  destroy(): void;
}
