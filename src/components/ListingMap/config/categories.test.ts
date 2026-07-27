import { describe, it, expect } from 'vitest';
import { CATEGORY_LIST, getCategoryConfig } from './categories';

describe('category config', () => {
  it('covers all three dataset categories', () => {
    expect(CATEGORY_LIST).toEqual(['Gayrimenkul', 'Arsa', 'Araç']);
  });

  it('gives each category a distinct color and icon id', () => {
    const colors = CATEGORY_LIST.map((c) => getCategoryConfig(c).color);
    const icons = CATEGORY_LIST.map((c) => getCategoryConfig(c).iconId);
    expect(new Set(colors).size).toBe(3);
    expect(new Set(icons).size).toBe(3);
  });

  it('uses ascii-safe icon ids for the sprite', () => {
    expect(getCategoryConfig('Araç').iconId).toBe('pin-arac');
  });
});
