import { t } from '../i18n/tr';
import type { SortMode } from '../types/filters';

const MODES: Array<{ mode: SortMode; label: string }> = [
  { mode: 'relevance', label: t.sortRelevance },
  { mode: 'price-asc', label: t.sortPriceAsc },
  { mode: 'price-desc', label: t.sortPriceDesc },
];

export interface SortControlViewProps {
  sort: SortMode;
  onChange(mode: SortMode): void;
}

/**
 * A segmented control rather than a `<select>`.
 *
 * There are exactly three modes and they never grow, so a dropdown hid two of
 * them behind a click and dropped an OS-chrome rectangle into a glass panel.
 * Laid out flat, the choice and its alternatives are both readable at a glance.
 */
export function SortControlView({ sort, onChange }: SortControlViewProps) {
  return (
    <div
      role="radiogroup"
      aria-label={t.sort}
      className="flex w-full gap-0.5 rounded-xl bg-ink-900/[0.06] p-0.5"
    >
      {MODES.map(({ mode, label }) => {
        const active = sort === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode)}
            className={[
              'flex-1 rounded-[0.625rem] px-2 py-1.5 text-xs font-medium',
              'transition-[background-color,color,box-shadow] duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-1',
              'focus-visible:outline-brand-500',
              active
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-900',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
