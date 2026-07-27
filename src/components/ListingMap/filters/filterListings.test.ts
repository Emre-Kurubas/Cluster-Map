import { describe, it, expect } from 'vitest';
import { filterListings } from './filterListings';
import { buildIndex } from '../search/useSearchIndex';
import { EMPTY_FILTERS } from '../types/filters';
import type { Listing } from '../types/listing';

const make = (over: Partial<Listing>): Listing => ({
  id: 1,
  title: 'Ankara Merkez\'de Satılık Arsa',
  subTitle: 'Ankara 1. İcra Dairesi',
  description: 'Ankara ilinde bulunan arsa',
  price: 1_000_000,
  category: 'Arsa',
  saleType: 'İcra',
  location: { lat: 39.9334, lng: 32.8597 },
  thumbnailUrl: '',
  detailUrl: '/ilan/1',
  ...over,
});

const listings: Listing[] = [
  make({ id: 1, price: 1_000_000, category: 'Arsa' }),
  make({ id: 2, price: 5_000_000, category: 'Araç', title: 'Ankara 2018 Model Ticari' }),
  make({
    id: 3, price: 600_000, category: 'Gayrimenkul',
    title: "Adıyaman Merkez'de Satılık Dubleks Mesken",
    location: { lat: 37.77194, lng: 38.30335 },
  }),
];

const index = buildIndex(listings);
const ids = (result: Listing[]) => result.map((l) => l.id);

describe('filterListings', () => {
  it('returns everything when no filter is active', () => {
    expect(ids(filterListings(index, EMPTY_FILTERS, '', null, 'relevance')))
      .toEqual([1, 2, 3]);
  });

  it('filters by category', () => {
    const filters = { ...EMPTY_FILTERS, categories: ['Araç' as const] };
    expect(ids(filterListings(index, filters, '', null, 'relevance'))).toEqual([2]);
  });

  it('treats multiple categories as a union', () => {
    const filters = { ...EMPTY_FILTERS, categories: ['Araç' as const, 'Arsa' as const] };
    expect(ids(filterListings(index, filters, '', null, 'relevance'))).toEqual([1, 2]);
  });

  it('applies an inclusive price ceiling', () => {
    const filters = { ...EMPTY_FILTERS, priceMax: 1_000_000 };
    expect(ids(filterListings(index, filters, '', null, 'relevance'))).toEqual([1, 3]);
  });

  it('applies an inclusive price floor', () => {
    const filters = { ...EMPTY_FILTERS, priceMin: 1_000_000 };
    expect(ids(filterListings(index, filters, '', null, 'relevance'))).toEqual([1, 2]);
  });

  it('intersects category and price rather than unioning them', () => {
    const filters = { ...EMPTY_FILTERS, categories: ['Arsa' as const], priceMax: 800_000 };
    expect(ids(filterListings(index, filters, '', null, 'relevance'))).toEqual([]);
  });

  it('filters by derived province', () => {
    expect(ids(filterListings(index, EMPTY_FILTERS, '', 'Adıyaman', 'relevance')))
      .toEqual([3]);
  });

  it('filters by fuzzy residual text', () => {
    expect(ids(filterListings(index, EMPTY_FILTERS, 'dubleks', null, 'relevance')))
      .toEqual([3]);
  });

  it('tolerates typos in the residual', () => {
    expect(ids(filterListings(index, EMPTY_FILTERS, 'tcari', null, 'relevance')))
      .toEqual([2]);
  });

  it('sorts by price ascending', () => {
    expect(ids(filterListings(index, EMPTY_FILTERS, '', null, 'price-asc')))
      .toEqual([3, 1, 2]);
  });

  it('sorts by price descending', () => {
    expect(ids(filterListings(index, EMPTY_FILTERS, '', null, 'price-desc')))
      .toEqual([2, 1, 3]);
  });

  it('falls back to price ascending when relevance has no query to rank by', () => {
    expect(ids(filterListings(index, EMPTY_FILTERS, '', null, 'relevance')))
      .toEqual([1, 2, 3]);
  });
});

describe('buildIndex', () => {
  it('derives province from coordinates', () => {
    expect(index[2].province).toBe('Adıyaman');
  });

  it('normalizes title tokens', () => {
    expect(index[0].titleTokens).toContain('satilik');
  });
});
