import { describe, it, expect, beforeEach } from 'vitest';
import { createListingStore } from './createListingStore';
import type { ListingStore } from './createListingStore';
import type { Chip } from '../types/filters';

// A fresh store per test. `railOpen` is deliberately outside resetAll's remit,
// so building a new store is the only honest way to get back to the start.
let store: ListingStore = createListingStore();
const state = () => store.getState();

describe('createListingStore', () => {
  beforeEach(() => { store = createListingStore(); });

  it('starts with no filters, every category visible, and the rail open', () => {
    expect(state().filters.categories).toEqual([]);
    expect(state().filters.hiddenCategories).toEqual([]);
    expect(state().filters.priceMin).toBeNull();
    expect(state().railOpen).toBe(true);
    expect(state().sort).toBe('relevance');
  });

  it('hides a category and brings it back', () => {
    state().toggleCategoryVisibility('Arsa');
    expect(state().filters.hiddenCategories).toEqual(['Arsa']);
    state().toggleCategoryVisibility('Arsa');
    expect(state().filters.hiddenCategories).toEqual([]);
  });

  it('accumulates multiple hidden categories', () => {
    state().toggleCategoryVisibility('Arsa');
    state().toggleCategoryVisibility('Araç');
    expect(state().filters.hiddenCategories).toEqual(['Arsa', 'Araç']);
  });

  it('lets every category be hidden at once, leaving nothing to show', () => {
    state().toggleCategoryVisibility('Arsa');
    state().toggleCategoryVisibility('Araç');
    state().toggleCategoryVisibility('Gayrimenkul');
    expect(state().filters.hiddenCategories).toHaveLength(3);
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

  // Regression: the debounced query parse fires on mount and on every
  // keystroke. Rebuilding filters from chips alone silently discarded whatever
  // the user had set by hand outside the search field.
  it('preserves hidden categories when a query is parsed', () => {
    state().toggleCategoryVisibility('Arsa');
    state().applyParsed([], '');
    expect(state().filters.hiddenCategories).toEqual(['Arsa']);
  });

  it('keeps legend exclusions alongside the categories a query included', () => {
    state().toggleCategoryVisibility('Arsa');
    state().applyParsed(
      [{ id: 'category:Araç', kind: 'category', label: 'Araç', category: 'Araç' }],
      '',
    );
    expect(state().filters.categories).toEqual(['Araç']);
    expect(state().filters.hiddenCategories).toEqual(['Arsa']);
  });

  it('keeps the hidden category after an unrelated chip is removed', () => {
    state().toggleCategoryVisibility('Arsa');
    state().applyParsed(
      [{ id: 'category:Araç', kind: 'category', label: 'Araç', category: 'Araç' }],
      '',
    );
    state().removeChip('category:Araç');
    expect(state().filters.categories).toEqual([]);
    expect(state().filters.hiddenCategories).toEqual(['Arsa']);
  });

  it('lets a price chip override a hand-typed range, then restores it on removal', () => {
    state().setPriceRange(100_000, 900_000);
    state().applyParsed(
      [{
        id: 'price:0:2000000', kind: 'price', label: '≤ 2.000.000 ₺',
        priceMin: null, priceMax: 2_000_000,
      }],
      '',
    );
    expect(state().filters.priceMax).toBe(2_000_000);
    state().removeChip('price:0:2000000');
    expect(state().filters.priceMin).toBe(100_000);
    expect(state().filters.priceMax).toBe(900_000);
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
    state().toggleCategoryVisibility('Arsa');
    state().select(4);
    state().setSort('price-desc');
    state().resetAll();
    expect(state().filters.hiddenCategories).toEqual([]);
    expect(state().selectedId).toBeNull();
    expect(state().sort).toBe('relevance');
  });

  /**
   * Whether the rail is open describes how the user has arranged the window,
   * not what they are filtering by — exactly like priceDomain, which already
   * survives. Folding it into the reset meant the search field's × and the
   * empty state's "Filtreleri temizle" both shoved the rail back open under a
   * user who had deliberately closed it.
   */
  it('resetAll leaves the rail as the user arranged it', () => {
    state().toggleRail();
    expect(state().railOpen).toBe(false);
    state().resetAll();
    expect(state().railOpen).toBe(false);
  });

  /**
   * The search field's × is labelled "Aramayı temizle" — clear the *search*.
   * It called resetAll, which also dropped the price range, the legend
   * exclusions and the sort mode, none of which the user typed.
   */
  describe('clearSearch', () => {
    it('clears the query, its chips and the province it resolved', () => {
      state().setQuery('ankara arsa');
      state().applyParsed(
        [
          { id: 'province:ankara', kind: 'province', label: 'Ankara', province: 'Ankara' },
          { id: 'category:Arsa', kind: 'category', label: 'Arsa', category: 'Arsa' },
        ],
        'dubleks',
      );
      state().clearSearch();

      expect(state().query).toBe('');
      expect(state().chips).toEqual([]);
      expect(state().residualQuery).toBe('');
      expect(state().activeProvince).toBeNull();
      expect(state().filters.categories).toEqual([]);
    });

    it('leaves hand-set filters and the sort mode alone', () => {
      state().toggleCategoryVisibility('Arsa');
      state().setPriceRange(100_000, 900_000);
      state().setSort('price-desc');
      state().setQuery('ankara');
      state().clearSearch();

      expect(state().filters.hiddenCategories).toEqual(['Arsa']);
      expect(state().filters.priceMin).toBe(100_000);
      expect(state().filters.priceMax).toBe(900_000);
      expect(state().sort).toBe('price-desc');
    });

    it('restores a hand-typed range that a price chip had overridden', () => {
      state().setPriceRange(100_000, 900_000);
      state().applyParsed(
        [{
          id: 'price:0:2000000', kind: 'price', label: '≤ 2.000.000 ₺',
          priceMin: null, priceMax: 2_000_000,
        }],
        '',
      );
      state().clearSearch();
      expect(state().filters.priceMax).toBe(900_000);
    });
  });

  /**
   * `ListingState` is published, so its shape is frozen by semver. `manual` is
   * bookkeeping — it records how a value arrived rather than what it is — and it
   * duplicates `filters`: `manual.priceMax` can read 900.000 while
   * `filters.priceMax` reads 2.000.000, because a price chip overrides a
   * hand-typed range. Two readable, authoritative-looking fields that
   * legitimately disagree is fine internally and wrong as a contract.
   *
   * It stays at runtime — the composition is built on it — and comes off the
   * exported type only.
   */
  describe('the published shape', () => {
    it('still composes hand-set filters with query chips', () => {
      state().toggleCategoryVisibility('Arsa');
      state().setPriceRange(100_000, 900_000);
      expect(state().filters.hiddenCategories).toEqual(['Arsa']);
      expect(state().filters.priceMin).toBe(100_000);
    });

    it('does not advertise the bookkeeping field', () => {
      // @ts-expect-error `manual` is not part of ListingState
      expect(state().manual).toBeDefined();
    });
  });
});
