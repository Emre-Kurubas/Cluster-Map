import { create } from 'zustand';
import { EMPTY_FILTERS } from '../types/filters';
import type { Chip, Filters, SortMode } from '../types/filters';
import type { Category } from '../types/listing';

interface ListingState {
  query: string;
  residualQuery: string;
  chips: Chip[];
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

const INITIAL = {
  query: '',
  residualQuery: '',
  chips: [] as Chip[],
  filters: EMPTY_FILTERS,
  activeProvince: null as string | null,
  sort: 'relevance' as SortMode,
  visibleIds: [] as number[],
  selectedId: null as number | null,
  hoveredId: null as number | null,
  railOpen: true,
};

/** Rebuild filters + province from a chip list. Chips are the source of truth. */
function foldChips(chips: Chip[]): { filters: Filters; province: string | null } {
  const filters: Filters = { ...EMPTY_FILTERS, categories: [], saleTypes: [] };
  let province: string | null = null;

  for (const chip of chips) {
    if (chip.kind === 'category' && chip.category) {
      if (!filters.categories.includes(chip.category)) {
        filters.categories = [...filters.categories, chip.category];
      }
    } else if (chip.kind === 'price') {
      filters.priceMin = chip.priceMin ?? null;
      filters.priceMax = chip.priceMax ?? null;
    } else if (chip.kind === 'province' && chip.province) {
      province = chip.province;
    }
  }

  return { filters, province };
}

export const useListingStore = create<ListingState>((set, get) => ({
  ...INITIAL,

  setQuery: (query) => set({ query }),

  applyParsed: (chips, residual) => {
    const { filters, province } = foldChips(chips);
    set({ chips, filters, activeProvince: province, residualQuery: residual });
  },

  removeChip: (id) => {
    const chips = get().chips.filter((chip) => chip.id !== id);
    const { filters, province } = foldChips(chips);
    set({ chips, filters, activeProvince: province });
  },

  toggleCategory: (category) => {
    const current = get().filters.categories;
    const categories = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    set({ filters: { ...get().filters, categories } });
  },

  setPriceRange: (priceMin, priceMax) =>
    set({ filters: { ...get().filters, priceMin, priceMax } }),

  setSort: (sort) => set({ sort }),
  setVisibleIds: (visibleIds) => set({ visibleIds }),
  select: (selectedId) => set({ selectedId }),
  hover: (hoveredId) => set({ hoveredId }),
  toggleRail: () => set({ railOpen: !get().railOpen }),
  resetAll: () => set({ ...INITIAL }),
}));
