import { describe, it, expect } from 'vitest';
import { buildIndex } from '../search/useSearchIndex';
import { filterListings } from '../filters/filterListings';
import { toGeoJSON } from './geo';
import { EMPTY_FILTERS } from '../types/filters';
import type { Listing } from '../types/listing';

const CATEGORIES = ['Arsa', 'Gayrimenkul', 'Araç'] as const;

const synthetic: Listing[] = Array.from({ length: 50_000 }, (_, i) => ({
  id: i,
  title: `İlan ${i} Satılık Dubleks Mesken`,
  subTitle: `Ankara ${i % 9}. İcra Dairesi`,
  description: 'Açık artırma usulüyle satılacaktır.',
  price: 500_000 + (i % 100) * 100_000,
  category: CATEGORIES[i % 3],
  saleType: 'İcra',
  location: { lat: 36 + (i % 60) / 10, lng: 27 + (i % 170) / 10 },
  thumbnailUrl: '',
  detailUrl: `/ilan/${i}`,
}));

describe('pipeline at scale', () => {
  const index = buildIndex(synthetic);

  it('indexes 50k listings in under two seconds', () => {
    const start = performance.now();
    buildIndex(synthetic);
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it('filters 50k listings in under 150ms', () => {
    const start = performance.now();
    const result = filterListings(
      index, { ...EMPTY_FILTERS, categories: ['Arsa'] }, '', null, 'price-asc',
    );
    expect(performance.now() - start).toBeLessThan(150);
    expect(result.length).toBeGreaterThan(0);
  });

  it('fuzzy-searches 50k listings in under 400ms', () => {
    const start = performance.now();
    const result = filterListings(index, EMPTY_FILTERS, 'dubleks', null, 'relevance');
    expect(performance.now() - start).toBeLessThan(400);
    expect(result.length).toBeGreaterThan(0);
  });

  it('converts 50k listings to GeoJSON in under 300ms', () => {
    const start = performance.now();
    expect(toGeoJSON(synthetic).features).toHaveLength(50_000);
    expect(performance.now() - start).toBeLessThan(300);
  });
});
