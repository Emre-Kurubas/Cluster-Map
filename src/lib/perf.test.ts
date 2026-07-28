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

/**
 * Benchmarks, run separately from the correctness suite.
 *
 * `npm run test` excludes this file and `npm run test:perf` runs it with
 * --no-file-parallelism. That separation is deliberate: a wall-clock assertion
 * competing with 22 other test files measures the OS scheduler, not the code.
 * Indexing 50k listings takes ~790ms on an idle CPU and blew past a 2000ms
 * budget under that contention — a false alarm that would have trained everyone
 * to ignore this file.
 *
 * These budgets are real, so they must only fail for real reasons.
 */

/**
 * Fastest of several runs, in milliseconds — the honest estimate of what an
 * operation costs when it actually gets the CPU. Still catches genuine
 * regressions: the 810ms fuzzy-search regression this suite originally found
 * was slow on every run, not just unlucky ones.
 */
function fastestOf(runs: number, operation: () => void): number {
  let best = Infinity;
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    operation();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

describe('pipeline at scale', () => {
  const index = buildIndex(synthetic);

  it('indexes 50k listings in under two seconds', () => {
    expect(fastestOf(3, () => buildIndex(synthetic))).toBeLessThan(2000);
  });

  it('filters 50k listings in under 150ms', () => {
    let count = 0;
    const elapsed = fastestOf(3, () => {
      count = filterListings(
        index, { ...EMPTY_FILTERS, categories: ['Arsa'] }, '', null, 'price-asc',
      ).length;
    });
    expect(elapsed).toBeLessThan(150);
    expect(count).toBeGreaterThan(0);
  });

  it('fuzzy-searches 50k listings in under 400ms', () => {
    let count = 0;
    const elapsed = fastestOf(3, () => {
      count = filterListings(index, EMPTY_FILTERS, 'dubleks', null, 'relevance').length;
    });
    expect(elapsed).toBeLessThan(400);
    expect(count).toBeGreaterThan(0);
  });

  it('converts 50k listings to GeoJSON in under 300ms', () => {
    let count = 0;
    const elapsed = fastestOf(3, () => {
      count = toGeoJSON(synthetic).features.length;
    });
    expect(elapsed).toBeLessThan(300);
    expect(count).toBe(50_000);
  });
});
