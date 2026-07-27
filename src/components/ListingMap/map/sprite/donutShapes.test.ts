import { describe, it, expect } from 'vitest';
import {
  DONUT_STEPS, buildDonutSvg, donutSpriteId, donutSpriteIds,
} from './donutShapes';
import { getCategoryConfig } from '../../config/categories';

const GAYRIMENKUL = getCategoryConfig('Gayrimenkul').color;
const ARSA = getCategoryConfig('Arsa').color;
const ARAC = getCategoryConfig('Araç').color;

describe('donutSpriteIds', () => {
  const ids = donutSpriteIds();

  it('covers every mix of tenths that can be reached', () => {
    // Compositions of DONUT_STEPS into three parts: (10+1)(10+2)/2 = 66.
    expect(ids).toHaveLength(((DONUT_STEPS + 1) * (DONUT_STEPS + 2)) / 2);
  });

  it('has no duplicates', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never lets the first two shares exceed the whole', () => {
    for (const id of ids) {
      const [, a, b] = id.split('-').map(Number);
      expect(a + b).toBeLessThanOrEqual(DONUT_STEPS);
    }
  });

  it('uses ascii ids, which is what addImage requires', () => {
    for (const id of ids) expect(id).toMatch(/^donut-\d+-\d+$/);
  });
});

describe('donutSpriteId', () => {
  it('names a sprite from the two leading shares', () => {
    expect(donutSpriteId(3, 5)).toBe('donut-3-5');
  });

  it('produces ids that exist in the generated set', () => {
    expect(donutSpriteIds()).toContain(donutSpriteId(0, 10));
    expect(donutSpriteIds()).toContain(donutSpriteId(10, 0));
  });
});

describe('buildDonutSvg', () => {
  it('draws one arc per category present', () => {
    const svg = buildDonutSvg(4, 3);
    expect(svg).toContain(GAYRIMENKUL);
    expect(svg).toContain(ARSA);
    expect(svg).toContain(ARAC);
  });

  it('omits a category with no listings rather than drawing a zero arc', () => {
    const svg = buildDonutSvg(10, 0);
    expect(svg).toContain(GAYRIMENKUL);
    expect(svg).not.toContain(ARSA);
    expect(svg).not.toContain(ARAC);
  });

  it('gives the remainder to the third category', () => {
    const svg = buildDonutSvg(0, 0);
    expect(svg).toContain(ARAC);
    expect(svg).not.toContain(GAYRIMENKUL);
  });

  it('emits a square svg with an explicit viewBox so it rasterizes crisply', () => {
    const svg = buildDonutSvg(5, 5);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="0 0 96 96"');
  });

  it('leaves a hole in the middle for the count to sit in', () => {
    expect(buildDonutSvg(5, 5)).toContain('class="hole"');
  });

  it('renders every id in the sprite set without throwing', () => {
    for (const id of donutSpriteIds()) {
      const [, a, b] = id.split('-').map(Number);
      expect(buildDonutSvg(a, b)).toContain('<svg');
    }
  });
});
