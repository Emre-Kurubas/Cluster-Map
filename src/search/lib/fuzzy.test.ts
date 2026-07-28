import { describe, it, expect } from 'vitest';
import { boundedLevenshtein, tokenScore, scoreListing } from './fuzzy';
import type { IndexedListing } from '../../types/listing';

describe('boundedLevenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(boundedLevenshtein('arsa', 'arsa', 2)).toBe(0);
  });

  it('counts a single substitution', () => {
    expect(boundedLevenshtein('arsa', 'arso', 2)).toBe(1);
  });

  it('counts a single deletion', () => {
    expect(boundedLevenshtein('adiyaman', 'adyaman', 2)).toBe(1);
  });

  it('bails out past the cap instead of computing the true distance', () => {
    expect(boundedLevenshtein('arsa', 'gayrimenkul', 2)).toBe(3);
  });

  it('uses the length gap as an early exit', () => {
    expect(boundedLevenshtein('ev', 'gayrimenkul', 2)).toBe(3);
  });
});

describe('tokenScore', () => {
  it('scores an exact match highest', () => {
    expect(tokenScore('arsa', 'arsa')).toBe(1);
  });

  it('scores a prefix match below exact', () => {
    expect(tokenScore('ars', 'arsa')).toBe(0.8);
  });

  it('scores a one-character typo below a prefix', () => {
    expect(tokenScore('adyaman', 'adiyaman')).toBe(0.6);
  });

  it('scores unrelated tokens at zero', () => {
    expect(tokenScore('araba', 'imarli')).toBe(0);
  });

  it('does not treat a one-letter query as a fuzzy match for everything', () => {
    expect(tokenScore('a', 'gayrimenkul')).toBe(0);
  });
});

const indexed = (over: Partial<IndexedListing> = {}): IndexedListing => ({
  listing: {
    id: 1,
    title: "Adıyaman Merkez'de Satılık Dubleks Mesken",
    subTitle: 'Adıyaman 2. İcra Dairesi - 2024/7924 Esas',
    description: 'Adıyaman ilinde bulunan Dubleks Mesken',
    price: 606000,
    category: 'Gayrimenkul',
    saleType: 'İcra',
    location: { lat: 37.77194, lng: 38.30335 },
    thumbnailUrl: '',
    detailUrl: '/ilan/1',
  },
  haystack: 'adiyaman merkezde satilik dubleks mesken adiyaman 2 icra dairesi',
  titleTokens: ['adiyaman', 'merkez', 'de', 'satilik', 'dubleks', 'mesken'],
  bodyTokens: ['adiyaman', '2', 'icra', 'dairesi', 'ilinde', 'bulunan'],
  province: 'Adıyaman',
  ...over,
});

describe('scoreListing', () => {
  it('scores an exact title token match above zero', () => {
    expect(scoreListing(indexed(), ['dubleks'])).toBeGreaterThan(0);
  });

  it('tolerates a typo in the query', () => {
    expect(scoreListing(indexed(), ['adyaman'])).toBeGreaterThan(0);
  });

  it('requires every query token to match something', () => {
    expect(scoreListing(indexed(), ['dubleks', 'traktor'])).toBe(0);
  });

  it('ranks a title hit above a body-only hit', () => {
    const titleHit = scoreListing(indexed(), ['dubleks']);
    const bodyHit = scoreListing(indexed(), ['dairesi']);
    expect(titleHit).toBeGreaterThan(bodyHit);
  });

  it('returns 0 for an empty query rather than matching everything', () => {
    expect(scoreListing(indexed(), [])).toBe(0);
  });
});
