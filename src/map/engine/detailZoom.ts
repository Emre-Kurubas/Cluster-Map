import type { Map as MapLibreMap } from 'maplibre-gl';

export interface DetailZoomOverride {
  id: string;
  minzoom?: number;
  maxzoom?: number;
}

/**
 * Basemap layers whose zoom range we widen, so zooming out does not empty the
 * map.
 *
 * positron is a general-purpose style: it assumes that at a country-wide view
 * you want a clean canvas, so it holds province names back to z5, town names
 * and real motorways to z6, and province borders all the way to z8. Framing
 * Türkiye lands around z5.4–6.1 on a desktop, so zooming out even slightly
 * dropped through all of those at once and left a coastline and a country
 * label.
 *
 * That is the wrong trade for this map. Someone zooming out here is looking at
 * where the listings are in the country, which is exactly when province names
 * and borders matter most.
 *
 * The data is already in the tiles at these zooms — `place`, `boundary` and
 * `transportation` all carry it, positron simply chooses not to draw it. Where
 * a tile genuinely has nothing at some zoom the layer draws nothing, which
 * costs us a no-op rather than an error. Label collision is MapLibre's job, so
 * widening these cannot produce a cluttered mess: surplus labels are dropped.
 */
export const DETAIL_ZOOM_OVERRIDES: DetailZoomOverride[] = [
  // The two that matter most on a country-wide view of a country's listings.
  { id: 'label_state', minzoom: 3 },
  { id: 'boundary_3', minzoom: 4 },

  { id: 'label_town', minzoom: 5 },

  /**
   * positron draws a faint hint of the motorways below z6 and the real thing
   * with casing above it. Bringing the real thing down one level means also
   * retiring the hint at the same point, or both would draw at once and every
   * motorway would be doubled.
   */
  { id: 'highway_motorway_casing', minzoom: 5 },
  { id: 'highway_motorway_inner', minzoom: 5 },
  { id: 'highway_motorway_subtle', maxzoom: 5 },
];

/**
 * Apply the overrides above to whatever the loaded style actually contains.
 *
 * A style is remote data and can rename or drop a layer between loads, so a
 * missing id is skipped rather than treated as an error — a basemap that lost
 * its town labels must not cost the map its listings.
 */
export function widenBasemapDetail(
  map: MapLibreMap,
  overrides: DetailZoomOverride[] = DETAIL_ZOOM_OVERRIDES,
): void {
  const present = new Map(
    (map.getStyle()?.layers ?? []).map((layer) => [layer.id, layer]),
  );

  for (const override of overrides) {
    const layer = present.get(override.id);
    if (!layer) continue;

    try {
      // Pass both ends every time: whichever the override leaves alone keeps
      // the value the style shipped.
      map.setLayerZoomRange(
        override.id,
        override.minzoom ?? layer.minzoom ?? 0,
        override.maxzoom ?? layer.maxzoom ?? 24,
      );
    } catch (error) {
      console.warn(`[ListingMap] could not widen base layer "${override.id}"`, error);
    }
  }
}
