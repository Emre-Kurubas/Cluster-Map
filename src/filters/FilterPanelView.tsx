import type { ReactNode } from 'react';
import { PriceRangeFilterView } from './PriceRangeFilterView';
import { SortControlView } from './SortControlView';
import { t } from '../i18n/tr';
import type { SortMode } from '../types/filters';

export interface FilterPanelViewProps {
  priceMin: number | null;
  priceMax: number | null;
  domain: { min: number; max: number };
  onPriceChange(min: number | null, max: number | null): void;
  sort: SortMode;
  onSortChange(mode: SortMode): void;
  hasActiveFilter: boolean;
  onReset(): void;
}

/**
 * The controls themselves, with no opinion about where they sit. FilterBar owns
 * the disclosure; this owns the layout of what's inside it.
 *
 * Two sections, hairline-separated, each labelled once. The reset lives at the
 * foot on its own rule so it never reads as part of the last control.
 *
 * It renders the *pure* halves of its children and forwards their state, which
 * is what lets the whole panel render outside a provider. The price and sort
 * props are wide because this is a composite: it is the sum of what it draws.
 */
export function FilterPanelView({
  priceMin, priceMax, domain, onPriceChange,
  sort, onSortChange,
  hasActiveFilter, onReset,
}: FilterPanelViewProps) {
  return (
    <div className="flex flex-col">
      {/* Category lives in CategoryDock, bottom-right — it doubles as the map's
          legend and is no use to anyone behind a disclosure. */}
      <Section title={t.priceRange}>
        <PriceRangeFilterView
          priceMin={priceMin}
          priceMax={priceMax}
          domain={domain}
          onChange={onPriceChange}
        />
      </Section>

      <Section title={t.sort}>
        <SortControlView sort={sort} onChange={onSortChange} />
      </Section>

      {hasActiveFilter && (
        <div className="border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onReset}
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line px-4 py-3.5 first:border-t-0">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-300">
        {title}
      </p>
      {children}
    </section>
  );
}
