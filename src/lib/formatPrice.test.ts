import { describe, it, expect } from 'vitest';
import { formatPrice, formatPriceCompact } from './formatPrice';

describe('formatPrice', () => {
  it('groups thousands with dots and appends the lira sign', () => {
    expect(formatPrice(4157000)).toBe('4.157.000 ₺');
    expect(formatPrice(543000)).toBe('543.000 ₺');
  });

  it('shows no decimal places', () => {
    expect(formatPrice(910000.75)).toBe('910.001 ₺');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('0 ₺');
  });
});

describe('formatPriceCompact', () => {
  it('abbreviates millions with a Turkish decimal comma', () => {
    expect(formatPriceCompact(4157000)).toBe('4,2 mn ₺');
    expect(formatPriceCompact(14968000)).toBe('15 mn ₺');
  });

  it('abbreviates thousands', () => {
    expect(formatPriceCompact(543000)).toBe('543 bin ₺');
  });

  it('leaves small numbers intact', () => {
    expect(formatPriceCompact(750)).toBe('750 ₺');
  });
});
