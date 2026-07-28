import { describe, it, expect } from 'vitest';
import { parseQuery } from './parseQuery';

describe('parseQuery', () => {
  it('returns an empty result for empty input', () => {
    expect(parseQuery('')).toEqual({ chips: [], residual: '', flyTo: null });
  });

  it('extracts province, price ceiling and category from one sentence', () => {
    const parsed = parseQuery('ankara 2 milyon alti arsa');
    expect(parsed.chips.map((c) => c.kind)).toEqual(['province', 'price', 'category']);
    expect(parsed.chips[0].label).toBe('Ankara');
    expect(parsed.chips[1].priceMax).toBe(2_000_000);
    expect(parsed.chips[2].category).toBe('Arsa');
    expect(parsed.residual).toBe('');
  });

  it('sets flyTo to the recognized province bbox', () => {
    const parsed = parseQuery('ankara');
    expect(parsed.flyTo).not.toBeNull();
    expect(parsed.flyTo![0]).toBeLessThan(parsed.flyTo![2]);
  });

  it('leaves flyTo null when no province is mentioned', () => {
    expect(parseQuery('dubleks').flyTo).toBeNull();
  });

  it('maps category synonyms to canonical categories', () => {
    expect(parseQuery('daire').chips[0].category).toBe('Gayrimenkul');
    expect(parseQuery('araba').chips[0].category).toBe('Araç');
    expect(parseQuery('tarla').chips[0].category).toBe('Arsa');
  });

  it('keeps unmatched words as the residual for fuzzy search', () => {
    const parsed = parseQuery('ankara dubleks mesken');
    expect(parsed.chips).toHaveLength(1);
    expect(parsed.residual).toBe('dubleks mesken');
  });

  it('gives price chips a formatted Turkish label', () => {
    expect(parseQuery('2 milyon alti').chips[0].label).toBe('≤ 2.000.000 ₺');
    expect(parseQuery('500 bin ustu').chips[0].label).toBe('≥ 500.000 ₺');
    expect(parseQuery('1 3 milyon arasi').chips[0].label)
      .toBe('1.000.000 – 3.000.000 ₺');
  });

  it('gives every chip a stable unique id', () => {
    const ids = parseQuery('ankara 2 milyon alti arsa').chips.map((c) => c.id);
    expect(ids).toEqual(['province:ankara', 'price:0:2000000', 'category:Arsa']);
    expect(new Set(ids).size).toBe(3);
  });

  it('does not mistake an esas number for a price', () => {
    const parsed = parseQuery('2024 esas');
    expect(parsed.chips).toHaveLength(0);
    expect(parsed.residual).toBe('2024 esas');
  });

  it('recognizes only one province, leaving later ones as residual text', () => {
    const parsed = parseQuery('ankara izmir');
    expect(parsed.chips).toHaveLength(1);
    expect(parsed.residual).toBe('izmir');
  });
});
