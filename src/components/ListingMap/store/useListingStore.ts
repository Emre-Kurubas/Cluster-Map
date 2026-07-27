import { create } from 'zustand';
import { EMPTY_FILTERS } from '../types/filters';
import type { Chip, Filters, SortMode } from '../types/filters';
import type { Category } from '../types/listing';

/** Filters set by hand in the FilterBar, independent of anything search parsed. */
interface ManualFilters {
  categories: Category[];
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
  sort: SortMode;
  visibleIds: number[];
  selectedId: number | null;
  hoveredId: number | null;
  railOpen: boolean;

  setQuery(query: string): void;
  applyParsed(chips: Chip[], residual: string): void;
  removeChip(id: string): void;
  toggleCategory(category: Category): void;
  setPriceRange(min: number | null, max: number | null): void;
  setSort(sort: SortMode): void;
  setVisibleIds(ids: number[]): void;
  select(id: number | null): void;
  hover(id: number | null): void;
  toggleRail(): void;
  resetAll(): void;
}

const NO_MANUAL: ManualFilters = { categories: [], priceMin: null, priceMax: null };

const INITIAL = {
  query: '',
  residualQuery: '',
  chips: [] as Chip[],
  manual: NO_MANUAL,
  filters: EMPTY_FILTERS,
  activeProvince: null as string | null,
  sort: 'relevance' as SortMode,
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
 * Categories union. A price chip overrides the hand-typed range, because the
 * user just expressed a newer intent in words. Province comes only from chips.
 */
function composeFilters(
  manual: ManualFilters,
  chips: Chip[],
): { filters: Filters; province: string | null } {
  const categories = [...manual.categories];
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
    filters: { categories, priceMin, priceMax, saleTypes: [] },
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

  toggleCategory: (category) => {
    const current = get().manual.categories;
    const categories = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    const manual = { ...get().manual, categories };
    const { filters, province } = composeFilters(manual, get().chips);
    set({ manual, filters, activeProvince: province });
  },

  setPriceRange: (priceMin, priceMax) => {
    const manual = { ...get().manual, priceMin, priceMax };
    const { filters, province } = composeFilters(manual, get().chips);
    set({ manual, filters, activeProvince: province });
  },

  setSort: (sort) => set({ sort }),
  setVisibleIds: (visibleIds) => set({ visibleIds }),
  select: (selectedId) => set({ selectedId }),
  hover: (hoveredId) => set({ hoveredId }),
  toggleRail: () => set({ railOpen: !get().railOpen }),
  resetAll: () => set({ ...INITIAL }),
}));
