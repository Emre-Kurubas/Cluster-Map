import { describe, it, expect } from 'vitest';
import { toGeoJSON, boundsAround, idsWithinBounds } from './geo';
import type { Listing } from '../types/listing';

const listing = (over: Partial<Listing> = {}): Listing => ({
  id: 1,
  title: 'Adana Merkez\'de Satılık Arsa',
  subTitle: 'Adana 2. İcra Dairesi',
  description: 'Açıklama',
  price: 4157000,
  category: 'Arsa',
  saleType: 'İcra',
  location: { lat: 36.962, lng: 35.3033 },
  thumbnailUrl: '',
  detailUrl: '/ilan/1',
  ...over,
});

describe('toGeoJSON', () => {
  it('emits Point features in lng,lat order', () => {
    const fc = toGeoJSON([listing()]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features[0].geometry.coordinates).toEqual([35.3033, 36.962]);
  });

  it('carries id, category and price into properties for layer expressions', () => {
    const props = toGeoJSON([listing()]).features[0].properties!;
    expect(props.id).toBe(1);
    expect(props.category).toBe('Arsa');
    expect(props.price).toBe(4157000);
  });

  it('sets a numeric feature id so feature-state works', () => {
    expect(toGeoJSON([listing({ id: 42 })]).features[0].id).toBe(42);
  });

  it('drops listings with non-finite coordinates', () => {
    const bad = listing({ id: 2, location: { lat: NaN, lng: 35 } });
    expect(toGeoJSON([listing(), bad]).features).toHaveLength(1);
  });

  it('drops listings with out-of-range coordinates', () => {
    const bad = listing({ id: 3, location: { lat: 200, lng: 35 } });
    expect(toGeoJSON([bad]).features).toHaveLength(0);
  });
});

describe('boundsAround', () => {
  it('pads a point into a bbox', () => {
    expect(boundsAround([30, 40], 0.5)).toEqual([29.5, 39.5, 30.5, 40.5]);
  });
});

/**
 * The results rail used to be fed by `queryRenderedFeatures` on the pin layer,
 * which by design excludes anything MapLibre folded into a cluster. At the
 * opening Türkiye-wide view every listing is clustered, so the rail reported
 * "0 ilan" beside a map covered in cluster bubbles. Viewport membership is a
 * question about coordinates, not about how the renderer chose to draw them.
 */
describe('idsWithinBounds', () => {
  const ankara = listing({ id: 1, location: { lat: 39.93, lng: 32.86 } });
  const izmir = listing({ id: 2, location: { lat: 38.42, lng: 27.14 } });

  it('returns listings inside the box', () => {
    expect(idsWithinBounds([ankara, izmir], [32, 39, 34, 41])).toEqual([1]);
  });

  it('excludes listings outside the box', () => {
    expect(idsWithinBounds([izmir], [32, 39, 34, 41])).toEqual([]);
  });

  it('counts clustered listings too — clustering is a drawing decision', () => {
    const dense = [
      listing({ id: 10, location: { lat: 39.93, lng: 32.86 } }),
      listing({ id: 11, location: { lat: 39.931, lng: 32.861 } }),
      listing({ id: 12, location: { lat: 39.932, lng: 32.862 } }),
    ];
    expect(idsWithinBounds(dense, [25.5, 35.6, 45, 42.5])).toEqual([10, 11, 12]);
  });

  it('treats the edge as inside', () => {
    const corner = listing({ id: 3, location: { lat: 41, lng: 34 } });
    expect(idsWithinBounds([corner], [32, 39, 34, 41])).toEqual([3]);
  });

  it('preserves the incoming order so the sort control stays authoritative', () => {
    const box: [number, number, number, number] = [25.5, 35.6, 45, 42.5];
    expect(idsWithinBounds([ankara, izmir], box)).toEqual([1, 2]);
    expect(idsWithinBounds([izmir, ankara], box)).toEqual([2, 1]);
  });

  it('skips listings with unusable coordinates', () => {
    const bad = listing({ id: 4, location: { lat: NaN, lng: 32.9 } });
    expect(idsWithinBounds([bad, ankara], [32, 39, 34, 41])).toEqual([1]);
  });

  it('handles a viewport crossing the antimeridian', () => {
    const fiji = listing({ id: 5, location: { lat: -17.7, lng: 178 } });
    const samoa = listing({ id: 6, location: { lat: -13.8, lng: -172 } });
    expect(idsWithinBounds([fiji, samoa, ankara], [170, -20, -170, -10]))
      .toEqual([5, 6]);
  });

  it('accepts every longitude when the viewport wraps the globe', () => {
    expect(idsWithinBounds([ankara, izmir], [-200, 35, 200, 42])).toEqual([1, 2]);
  });
});
