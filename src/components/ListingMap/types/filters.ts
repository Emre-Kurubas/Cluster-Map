import type { Category } from './listing';
import type { BBox } from './map';

export interface Filters {
  /** Empty array means "no category filter" — everything passes. */
  categories: Category[];
  priceMin: number | null;
  priceMax: number | null;
  /** Empty array means "no saleType filter". */
  saleTypes: string[];
}

export type ChipKind = 'province' | 'category' | 'price';

export interface Chip {
  /** Stable identity for React keys and removal, e.g. "province:ankara". */
  id: string;
  kind: ChipKind;
  /** Display text, already Turkish-cased, e.g. "Ankara" or "≤ 2.000.000 ₺". */
  label: string;
  province?: string;
  category?: Category;
  priceMin?: number | null;
  priceMax?: number | null;
}

export interface ParsedQuery {
  chips: Chip[];
  /** Text left over after all matchers consumed their tokens. */
  residual: string;
  /** Set when a province was recognized; the map should fly here. */
  flyTo: BBox | null;
}

export type SortMode = 'relevance' | 'price-asc' | 'price-desc';

export const EMPTY_FILTERS: Filters = {
  categories: [],
  priceMin: null,
  priceMax: null,
  saleTypes: [],
};
