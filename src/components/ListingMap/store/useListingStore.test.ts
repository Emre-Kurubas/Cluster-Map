import { describe, it, expect, beforeEach } from 'vitest';
import { useListingStore } from './useListingStore';
import type { Chip } from '../types/filters';

const reset = () => useListingStore.getState().resetAll();
const state = () => useListingStore.getState();

describe('useListingStore', () => {
  beforeEach(reset);

  it('starts with no filters and the rail open', () => {
    expect(state().filters.categories).toEqual([]);
    expect(state().filters.priceMin).toBeNull();
    expect(state().railOpen).toBe(true);
    expect(state().sort).toBe('relevance');
  });

  it('toggles a category on and off', () => {
    state().toggleCategory('Arsa');
    expect(state().filters.categories).toEqual(['Arsa']);
    state().toggleCategory('Arsa');
    expect(state().filters.categories).toEqual([]);
  });

  it('accumulates multiple categories', () => {
    state().toggleCategory('Arsa');
    state().toggleCategory('Araç');
    expect(state().filters.categories).toEqual(['Arsa', 'Araç']);
  });

  it('folds parsed chips into filters', () => {
    const chips: Chip[] = [
      { id: 'province:ankara', kind: 'province', label: 'Ankara', province: 'Ankara' },
      { id: 'price:0:2000000', kind: 'price', label: '≤ 2.000.000 ₺', priceMin: null, priceMax: 2_000_000 },
      { id: 'category:Arsa', kind: 'category', label: 'Arsa', category: 'Arsa' },
    ];
    state().applyParsed(chips, 'dubleks');
    expect(state().filters.categories).toEqual(['Arsa']);
    expect(state().filters.priceMax).toBe(2_000_000);
    expect(state().activeProvince).toBe('Ankara');
    expect(state().residualQuery).toBe('dubleks');
  });

  it('removes a chip and unwinds the filter it contributed', () => {
    const chips: Chip[] = [
      { id: 'price:0:2000000', kind: 'price', label: '≤ 2.000.000 ₺', priceMin: null, priceMax: 2_000_000 },
    ];
    state().applyParsed(chips, '');
    state().removeChip('price:0:2000000');
    expect(state().chips).toEqual([]);
    expect(state().filters.priceMax).toBeNull();
  });

  it('clears the active province when its chip is removed', () => {
    const chips: Chip[] = [
      { id: 'province:ankara', kind: 'province', label: 'Ankara', province: 'Ankara' },
    ];
    state().applyParsed(chips, '');
    state().removeChip('province:ankara');
    expect(state().activeProvince).toBeNull();
  });

  it('replaces chips wholesale on a new parse rather than appending', () => {
    state().applyParsed([{ id: 'category:Arsa', kind: 'category', label: 'Arsa', category: 'Arsa' }], '');
    state().applyParsed([{ id: 'category:Araç', kind: 'category', label: 'Araç', category: 'Araç' }], '');
    expect(state().chips).toHaveLength(1);
    expect(state().filters.categories).toEqual(['Araç']);
  });

  it('keeps manually toggled categories out of chip-driven resets', () => {
    state().toggleCategory('Arsa');
    state().applyParsed([], '');
    expect(state().filters.categories).toEqual([]);
  });

  it('stores viewport ids without touching other state', () => {
    state().setVisibleIds([1, 2, 3]);
    expect(state().visibleIds).toEqual([1, 2, 3]);
    expect(state().selectedId).toBeNull();
  });

  it('tracks selection and hover independently', () => {
    state().select(7);
    state().hover(9);
    expect(state().selectedId).toBe(7);
    expect(state().hoveredId).toBe(9);
    state().select(null);
    expect(state().selectedId).toBeNull();
    expect(state().hoveredId).toBe(9);
  });

  it('toggles the rail', () => {
    state().toggleRail();
    expect(state().railOpen).toBe(false);
  });

  it('resetAll returns to the initial state', () => {
    state().toggleCategory('Arsa');
    state().select(4);
    state().setSort('price-desc');
    state().resetAll();
    expect(state().filters.categories).toEqual([]);
    expect(state().selectedId).toBeNull();
    expect(state().sort).toBe('relevance');
  });
});
