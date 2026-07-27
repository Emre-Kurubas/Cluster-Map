import type { Feature, FeatureCollection, Point } from 'geojson';
import type { Listing } from '../types/listing';
import type { BBox, LngLat } from '../types/map';

function hasValidLocation(listing: Listing): boolean {
  const { lat, lng } = listing.location ?? {};
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

/**
 * Convert listings to a GeoJSON FeatureCollection for the MapLibre source.
 *
 * Feature `id` is set to the listing id (numeric) because feature-state
 * requires it; hover and selection are driven entirely through that.
 * Invalid coordinates are dropped here rather than crashing the source.
 */
export function toGeoJSON(
  listings: Listing[],
): FeatureCollection<Point> {
  const features: Feature<Point>[] = [];
  let dropped = 0;

  for (const listing of listings) {
    if (!hasValidLocation(listing)) {
      dropped += 1;
      continue;
    }
    features.push({
      type: 'Feature',
      id: listing.id,
      geometry: {
        type: 'Point',
        coordinates: [listing.location.lng, listing.location.lat],
      },
      properties: {
        id: listing.id,
        category: listing.category,
        price: listing.price,
      },
    });
  }

  if (dropped > 0) {
    console.warn(`[ListingMap] ${dropped} listing(s) dropped: invalid coordinates`);
  }

  return { type: 'FeatureCollection', features };
}

export function boundsAround(center: LngLat, paddingDeg: number): BBox {
  return [
    center[0] - paddingDeg,
    center[1] - paddingDeg,
    center[0] + paddingDeg,
    center[1] + paddingDeg,
  ];
}
