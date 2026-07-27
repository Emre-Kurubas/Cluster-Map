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

/**
 * Ids of the listings whose coordinates fall inside `bbox`, in input order.
 *
 * Deliberately geometric rather than a `queryRenderedFeatures` call on the pin
 * layer: that layer hides clustered points, so at the opening Türkiye-wide view
 * — where everything is clustered — it reports nothing visible. What the rail
 * needs is "which listings are in the viewport", which the coordinates answer
 * regardless of whether the renderer drew a pin or folded it into a bubble.
 */
export function idsWithinBounds(listings: Listing[], bbox: BBox): number[] {
  const [west, south, east, north] = bbox;
  // A viewport can span more than the world when zoomed out, and can wrap past
  // the antimeridian, in which case west is numerically greater than east.
  const wrapsWorld = east - west >= 360;
  const crossesAntimeridian = west > east;

  const ids: number[] = [];
  for (const listing of listings) {
    if (!hasValidLocation(listing)) continue;
    const { lat, lng } = listing.location;
    if (lat < south || lat > north) continue;

    const lngInside = wrapsWorld
      || (crossesAntimeridian ? lng >= west || lng <= east : lng >= west && lng <= east);
    if (lngInside) ids.push(listing.id);
  }
  return ids;
}

export function boundsAround(center: LngLat, paddingDeg: number): BBox {
  return [
    center[0] - paddingDeg,
    center[1] - paddingDeg,
    center[0] + paddingDeg,
    center[1] + paddingDeg,
  ];
}
