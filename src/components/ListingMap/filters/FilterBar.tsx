import { useState } from 'react';
import { GlassPanel } from '../ui/GlassPanel';
import { GLASS_BLUR, GLASS_SHADOW, GLASS_TINT } from '../ui/glass';
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

  // Categories count whichever way they were narrowed — a query chip that
  // included one, or a legend row that crossed one out.
  const activeCount =
    filters.categories.length +
    filters.hiddenCategories.length +
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
        // h-12 matches the search field exactly, so the two line up on the
        // shared top edge whatever the type inside them measures.
        className={[
          'flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-medium',
          GLASS_BLUR, GLASS_SHADOW,
          'transition-transform duration-200 ease-[var(--ease-spring)]',
          'active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2',
          'focus-visible:outline-brand-500',
          // Only the tint changes when it is carrying filters; the sheet of
          // glass under it is the same one the search field sits on.
          open || activeCount > 0
            ? 'border border-brand-500/60 bg-brand-100/80 text-brand-700'
            : `${GLASS_TINT} text-ink-500 hover:text-ink-900`,
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
        <FilterLines open={open} />
      </button>

      {open && (
        <GlassPanel
          className="absolute right-0 top-full z-10 mt-2 w-72 overflow-hidden
                     motion-safe:animate-[detail-in_200ms_var(--ease-spring)]"
        >
          <FilterPanel hasActiveFilter={activeCount > 0} />
        </GlassPanel>
      )}
    </div>
  );
}

/**
 * Three staggered lines that turn on their side when the panel opens.
 *
 * Replaces a chevron, which only ever said "there is more below". The lines say
 * what the control is, and swinging them a quarter turn says which state it is
 * in without borrowing a different glyph to do it. Each line rotates about the
 * icon's centre, so the stagger sweeps through the turn rather than snapping.
 */
function FilterLines({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`size-4 shrink-0 transition-transform duration-300
                  ease-[var(--ease-spring)] ${open ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
    >
      <path d="M2 4h12" />
      <path d="M4 8h8" />
      <path d="M6 12h4" />
    </svg>
  );
}
