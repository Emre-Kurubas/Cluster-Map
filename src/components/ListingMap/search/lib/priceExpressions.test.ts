import { describe, it, expect } from 'vitest';
import { parsePriceExpression } from './priceExpressions';

describe('parsePriceExpression', () => {
  it('parses an upper bound with "alti"', () => {
    const hit = parsePriceExpression(['2', 'milyon', 'alti']);
    expect(hit).toMatchObject({ min: null, max: 2_000_000 });
    expect(hit?.indices).toEqual([0, 1, 2]);
  });

  it('parses a lower bound with "ustu"', () => {
    expect(parsePriceExpression(['500', 'bin', 'ustu']))
      .toMatchObject({ min: 500_000, max: null });
  });

  it('accepts "uzeri" as a synonym for "ustu"', () => {
    expect(parsePriceExpression(['1', 'milyon', 'uzeri']))
      .toMatchObject({ min: 1_000_000, max: null });
  });

  it('accepts "az" and "fazla" phrasings', () => {
    expect(parsePriceExpression(['3', 'milyon', 'az']))
      .toMatchObject({ min: null, max: 3_000_000 });
    expect(parsePriceExpression(['3', 'milyon', 'fazla']))
      .toMatchObject({ min: 3_000_000, max: null });
  });

  it('parses a range written with a dash-separated pair of tokens', () => {
    expect(parsePriceExpression(['1', '3', 'milyon', 'arasi']))
      .toMatchObject({ min: 1_000_000, max: 3_000_000 });
  });

  it('parses a bare grouped figure with a currency word', () => {
    const hit = parsePriceExpression(['2000000', 'tl']);
    expect(hit).toMatchObject({ min: null, max: 2_000_000 });
  });

  it('parses the shorthand "2m"', () => {
    expect(parsePriceExpression(['2m'])).toMatchObject({ max: 2_000_000 });
  });

  it('ignores numbers that are clearly not prices', () => {
    expect(parsePriceExpression(['2024', 'esas'])).toBeNull();
    expect(parsePriceExpression(['500m2', 'arsa'])).toBeNull();
  });

  it('returns null when there is no price expression', () => {
    expect(parsePriceExpression(['ankara', 'arsa'])).toBeNull();
  });

  it('finds the expression when it is not at the start', () => {
    const hit = parsePriceExpression(['ankara', 'arsa', '2', 'milyon', 'alti']);
    expect(hit?.indices).toEqual([2, 3, 4]);
  });
});
