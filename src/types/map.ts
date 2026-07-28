import type { Listing } from './listing';

/** [west, south, east, north] */
export type BBox = [number, number, number, number];
/** [lng, lat] */
export type LngLat = [number, number];

export interface MapEngine {
  setData(listings: Listing[]): void;
  flyToBounds(bbox: BBox): void;
  /** `offset` shifts the target in pixels relative to the container centre. */
  flyToPoint(center: LngLat, zoom: number, offset?: [number, number]): void;
  /** Container-relative screen position of a geographic point. */
  project(lngLat: LngLat): [number, number];
  queryVisibleIds(): number[];
  setHovered(id: number | null): void;
  setSelected(id: number | null): void;
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  /** Returns an unsubscribe function. */
  onIdle(cb: () => void): () => void;
  /**
   * Fires on camera movement and on container resize. `move` alone misses a
   * resize, which shifts every projected point without any camera change.
   */
  onMove(cb: () => void): () => void;
  onFeatureClick(cb: (id: number) => void): () => void;
  /**
   * Fires with the pin under the pointer, and with `null` when it leaves. The
   * same channel the rail's card hover feeds, so a pin lights up identically
   * whichever side the pointer is on.
   */
  onFeatureHover(cb: (id: number | null) => void): () => void;
  onClusterClick(cb: (clusterId: number, center: LngLat) => void): () => void;
  destroy(): void;
}
