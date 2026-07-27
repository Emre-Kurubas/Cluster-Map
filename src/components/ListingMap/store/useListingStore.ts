import { create } from 'zustand';
import { EMPTY_FILTERS } from '../types/filters';
import type { Chip, Filters, SortMode } from '../types/filters';
import type { Category } from '../types/listing';

/** Filters set by hand in the chrome, independent of anything search parsed. */
interface ManualFilters {
  /** Categories crossed out in the legend. Empty means everything is shown. */
  hiddenCategories: Category[];
  priceMin: number | null;
  priceMax: number | null;
}

interface ListingState {
  query: string;
  residualQuery: string;
  chips: Chip[];
  manual: ManualFilters;
  /** Derived: manual filters merged with whatever the query's chips contribute. */
  filters: Filters;
  activeProvince: string | null;
  /**
   * The full dataset's price extent, so the range slider spans what actually
   * exists. Taken from every listing rather than the filtered set — a domain
   * that collapsed as you dragged would make the control fight itself.
   */
  priceDomain: { min: number; max: number };
  sort: SortMode;
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

export const useListingStore = create<ListingState>((set, get) => ({
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
