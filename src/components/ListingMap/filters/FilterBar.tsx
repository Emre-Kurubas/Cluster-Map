import { GlassPanel } from '../ui/GlassPanel';
import { CategoryFilter } from './CategoryFilter';
import { PriceRangeFilter } from './PriceRangeFilter';
import { SortControl } from './SortControl';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

export function FilterBar() {
  const filters = useListingStore((state) => state.filters);
  const resetAll = useListingStore((state) => state.resetAll);

  const hasActiveFilter =
    filters.categories.length > 0 ||
    filters.priceMin !== null ||
    filters.priceMax !== null;

  return (
    <GlassPanel
      className="pointer-events-auto flex flex-wrap items-center gap-2 px-3 py-2"
      role="region"
      aria-label={t.filters}
    >
      <CategoryFilter />
      <span className="h-5 w-px bg-line" aria-hidden />
      <PriceRangeFilter />
      <span className="h-5 w-px bg-line" aria-hidden />
      <SortControl />
      {hasActiveFilter && (
        <button
          type="button"
          onClick={resetAll}
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-700
                     transition-transform duration-200 ease-[var(--ease-spring)]
                     hover:bg-brand-100 active:scale-95
                     focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {t.clearFilters}
        </button>
      )}
    </GlassPanel>
  );
}
