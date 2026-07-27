import { useState } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { FilterPanel } from './FilterPanel';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

/**
 * A disclosure rather than a permanent bar.
 *
 * The controls used to sit in a second row under the search field, taking a
 * band across the map at all times. Collapsed, they cost one button, and the
 * count keeps the filter state visible while they are hidden.
 */
export function FilterBar() {
  const [open, setOpen] = useState(false);
  const filters = useListingStore((state) => state.filters);

  const activeCount =
    filters.categories.length +
    (filters.priceMin !== null || filters.priceMax !== null ? 1 : 0);

  return (
    <div
      className="pointer-events-auto relative shrink-0"
      role="region"
      aria-label={t.filters}
    >
      <button
        type="button"
        data-testid="filters-toggle"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        className={[
          'flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-medium',
          'backdrop-blur-xl transition-transform duration-200 ease-[var(--ease-spring)]',
          'active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-brand-500',
          open || activeCount > 0
            ? 'border-brand-500/60 bg-brand-100/80 text-brand-700'
            : 'border-white/60 bg-white/65 text-ink-500 hover:text-ink-900',
        ].join(' ')}
      >
        {t.filters}
        {activeCount > 0 && (
          <span
            className="grid size-5 place-items-center rounded-full bg-brand-700
                       text-xs font-bold tabular-nums text-white"
          >
            {activeCount}
            <span className="sr-only">{t.activeFilters(activeCount)}</span>
          </span>
        )}
        <span
          aria-hidden
          className={`text-ink-300 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          ⌄
        </span>
      </button>

      {open && (
        <GlassPanel
          className="absolute right-0 top-full z-10 mt-2 w-72
                     motion-safe:animate-[detail-in_200ms_var(--ease-spring)]"
        >
          <FilterPanel hasActiveFilter={activeCount > 0} />
        </GlassPanel>
      )}
    </div>
  );
}
