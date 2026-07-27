import { describe, it, expect } from 'vitest';
import { toGeoJSON, boundsAround } from './geo';
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
