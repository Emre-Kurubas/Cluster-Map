import { PriceRangeFilter } from './PriceRangeFilter';
import { SortControl } from './SortControl';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

/**
 * The controls themselves, with no opinion about where they sit. FilterBar owns
 * the disclosure; this owns the layout of what's inside it.
 */
export function FilterPanel({ hasActiveFilter }: { hasActiveFilter: boolean }) {
  const resetAll = useListingStore((state) => state.resetAll);

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Category lives in CategoryDock, bottom-right — it doubles as the map's
          legend and is no use to anyone behind a disclosure. */}
      <Section title={t.priceRange}>
        <PriceRangeFilter />
      </Section>

      <Section title={t.sort}>
        <SortControl />
      </Section>

      {hasActiveFilter && (
        <button
          type="button"
          onClick={resetAll}
          className="rounded-lg border border-line bg-white/70 px-2.5 py-1.5 text-sm
                     font-medium text-brand-700 transition-transform duration-200
                     ease-[var(--ease-spring)] hover:bg-brand-100 active:scale-95
                     focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {t.clearFilters}
        </button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">
        {title}
      </p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
