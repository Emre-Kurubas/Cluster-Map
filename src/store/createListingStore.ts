import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { EMPTY_FILTERS } from '../types/filters';
import type { Chip, Filters, SortMode } from '../types/filters';
import type { Category } from '../types/listing';

/** Filters set by hand in the chrome, independent of anything search parsed. */
export interface ManualFilters {
  /** Categories crossed out in the legend. Empty means everything is shown. */
  hiddenCategories: Category[];
  priceMin: number | null;
  priceMax: number | null;
}

export interface ListingState {
  query: string;
  residualQuery: string;
  chips: Chip[];
  /**
   * Hand-set filters merged with whatever the query's chips contribute.
   *
   * Stored rather than derived through a selector on purpose: a selector that
   * built a fresh object would return a new identity on every store update, so
   * `Object.is` would fail and every subscriber would re-render on changes that
   * had nothing to do with filtering — hover, viewport, the rail toggle.
   *
   * Note the two category fields carry opposite polarity. `categories` is
   * inclusion, contributed only by the query; `hiddenCategories` is exclusion,
   * driven by the legend. `categories: []` means "no inclusion filter", not
   * "nothing is shown".
   */
  filters: Filters;
  activeProvince: string | null;
  /**
   * The full dataset's price extent, so the range slider spans what actually
   * exists. Taken from every listing rather than the filtered set — a domain
   * that collapsed as you dragged would make the control fight itself.
   */
  priceDomain: { min: number; max: number };
  sort: SortMode;
  /**
   * Listings inside the current viewport, rewritten on every map `idle`.
   * High-churn: subscribe to it deliberately, not incidentally.
   */
  visibleIds: number[];
  selectedId: number | null;
  hoveredId: number | null;
  railOpen: boolean;

  setQuery(query: string): void;
  applyParsed(chips: Chip[], residual: string): void;
  removeChip(id: string): void;
  /**
   * Drop the query and everything it contributed, leaving hand-set filters,
   * the sort mode and the rail exactly as they are.
   */
  clearSearch(): void;
  /** Cross a category out of the legend, or bring it back. */
  toggleCategoryVisibility(category: Category): void;
  setPriceRange(min: number | null, max: number | null): void;
  setPriceDomain(min: number, max: number): void;
  setSort(sort: SortMode): void;
  setVisibleIds(ids: number[]): void;
  select(id: number | null): void;
  hover(id: number | null): void;
  toggleRail(): void;
  resetAll(): void;
}

/**
 * The store as this module builds it.
 *
 * `manual` lives here rather than on `ListingState` because `ListingState` is
 * published and therefore frozen by semver. It is bookkeeping — it records how
 * a value arrived rather than what it is — and it duplicates `filters`:
 * `manual.priceMax` can read 900.000 while `filters.priceMax` reads 2.000.000,
 * because a price chip overrides a hand-typed range. Two authoritative-looking
 * fields that legitimately disagree are fine as an implementation and wrong as
 * a contract.
 *
 * Nothing changes at runtime; the field is simply not something consumers are
 * owed forever.
 */
export interface InternalListingState extends ListingState {
  manual: ManualFilters;
}

/** Internal escape hatch: the context needs the real api to drive `useStore`. */
export type InternalStoreApi = StoreApi<InternalListingState>;

/**
 * What consumers hold.
 *
 * Deliberately not zustand's `StoreApi`: the moment that type appears in a
 * published `.d.ts`, zustand stops being an implementation detail and becomes a
 * peer dependency we could never swap.
 */
export interface ListingStore {
  getState(): ListingState;
  setState(partial: Partial<ListingState>): void;
  subscribe(listener: () => void): () => void;
}

const NO_MANUAL: ManualFilters = {
  hiddenCategories: [],
  priceMin: null,
  priceMax: null,
};

const INITIAL = {
  query: '',
  residualQuery: '',
  chips: [] as Chip[],
  manual: NO_MANUAL,
  filters: EMPTY_FILTERS,
  activeProvince: null as string | null,
  sort: 'relevance' as SortMode,
  priceDomain: { min: 0, max: 0 },
  visibleIds: [] as number[],
  selectedId: null as number | null,
  hoveredId: null as number | null,
  railOpen: true,
};

/**
 * Merge hand-set filters with whatever the search query's chips contribute.
 *
 * These are two independent inputs to the same filter set, so neither may
 * clobber the other. Rebuilding `filters` from chips alone used to wipe a
 * category the user had toggled in the FilterBar the moment the debounced
 * query parse ran — including the one that fires on mount.
 *
 * Category inclusion comes only from chips; the legend expresses itself as
 * exclusions instead, which pass straight through. A price chip overrides the
 * hand-typed range, because the user just expressed a newer intent in words.
 * Province comes only from chips.
 */
function composeFilters(
  manual: ManualFilters,
  chips: Chip[],
): { filters: Filters; province: string | null } {
  const categories: Category[] = [];
  let priceMin = manual.priceMin;
  let priceMax = manual.priceMax;
  let province: string | null = null;

  for (const chip of chips) {
    if (chip.kind === 'category' && chip.category) {
      if (!categories.includes(chip.category)) categories.push(chip.category);
    } else if (chip.kind === 'price') {
      priceMin = chip.priceMin ?? null;
      priceMax = chip.priceMax ?? null;
    } else if (chip.kind === 'province' && chip.province) {
      province = chip.province;
    }
  }

  return {
    filters: {
      categories,
      hiddenCategories: manual.hiddenCategories,
      priceMin,
      priceMax,
      saleTypes: [],
    },
    province,
  };
}

/**
 * One store per `<ListingMap>`.
 *
 * Was a module-scope singleton, which meant remounting the map kept the
 * previous query and filters, and two maps on one page fought over one set.
 */
export function createListingStore(): ListingStore {
  const store = createStore<InternalListingState>((set, get) => ({
    ...INITIAL,

    setQuery: (query) => set({ query }),

    applyParsed: (chips, residual) => {
      const { filters, province } = composeFilters(get().manual, chips);
      set({ chips, filters, activeProvince: province, residualQuery: residual });
    },

    removeChip: (id) => {
      const chips = get().chips.filter((chip) => chip.id !== id);
      const { filters, province } = composeFilters(get().manual, chips);
      set({ chips, filters, activeProvince: province });
    },

    /**
     * The search field's × used to call resetAll, which also dropped the price
     * range, the legend exclusions and the sort mode — none of which the user had
     * typed into the field they were clearing. Recomposing from the manual
     * filters alone is the whole fix: it unwinds every chip's contribution,
     * including a price chip that had overridden a hand-typed range, and touches
     * nothing else.
     */
    clearSearch: () => {
      const { filters, province } = composeFilters(get().manual, []);
      set({
        query: '',
        chips: [],
        residualQuery: '',
        filters,
        activeProvince: province,
      });
    },

    toggleCategoryVisibility: (category) => {
      const current = get().manual.hiddenCategories;
      const hiddenCategories = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      const manual = { ...get().manual, hiddenCategories };
      const { filters, province } = composeFilters(manual, get().chips);
      set({ manual, filters, activeProvince: province });
    },

    setPriceRange: (priceMin, priceMax) => {
      const manual = { ...get().manual, priceMin, priceMax };
      const { filters, province } = composeFilters(manual, get().chips);
      set({ manual, filters, activeProvince: province });
    },

    setPriceDomain: (min, max) => set({ priceDomain: { min, max } }),

    setSort: (sort) => set({ sort }),
    setVisibleIds: (visibleIds) => set({ visibleIds }),
    select: (selectedId) => set({ selectedId }),
    hover: (hoveredId) => set({ hoveredId }),
    toggleRail: () => set({ railOpen: !get().railOpen }),
    /**
     * The price domain describes the dataset, not the user's choices, so it
     * survives a reset — re-deriving it would need the listings back.
     *
     * `railOpen` survives for the mirror-image reason: it describes how the user
     * has arranged the window, not what they are filtering by. Folding it in
     * meant both the search field's × and the empty state's "Filtreleri temizle"
     * shoved the rail back open under someone who had deliberately shut it.
     */
    resetAll: () => set({
      ...INITIAL,
      priceDomain: get().priceDomain,
      railOpen: get().railOpen,
    }),
  }));

  return store as ListingStore;
}
