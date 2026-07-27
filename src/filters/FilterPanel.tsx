import { PriceRangeFilter } from './PriceRangeFilter';
import { SortControl } from './SortControl';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

/**
 * The controls themselves, with no opinion about where they sit. FilterBar owns
 * the disclosure; this owns the layout of what's inside it.
 *
 * Two sections, hairline-separated, each labelled once. The reset lives at the
 * foot on its own rule so it never reads as part of the last control.
 */
export function FilterPanel({ hasActiveFilter }: { hasActiveFilter: boolean }) {
  const resetAll = useListingStore((state) => state.resetAll);

  return (
    <div className="flex flex-col">
      {/* Category lives in CategoryDock, bottom-right — it doubles as the map's
          legend and is no use to anyone behind a disclosure. */}
      <Section title={t.priceRange}>
        <PriceRangeFilter />
      </Section>

      <Section title={t.sort}>
        <SortControl />
      </Section>

      {hasActiveFilter && (
        <div className="border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={resetAll}
            className="w-full rounded-lg px-2.5 py-1.5 text-sm font-medium
                       text-brand-700 transition-colors duration-200
                       hover:bg-brand-100 focus-visible:outline-2
                       focus-visible:outline-offset-1 focus-visible:outline-brand-500"
          >
            {t.clearFilters}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line px-4 py-3.5 first:border-t-0">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-300">
        {title}
      </p>
      {children}
    </section>
  );
}
