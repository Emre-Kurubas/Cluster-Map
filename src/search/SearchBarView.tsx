import { GlassPanel } from '../ui/GlassPanel';
import { Chip as ChipPill } from '../ui/Chip';
import { t } from '../i18n/tr';
import type { Chip } from '../types/filters';

export interface SearchBarViewProps {
  query: string;
  /** Filters the query parsed out, each removable. */
  chips: Chip[];
  onQueryChange(query: string): void;
  onRemoveChip(id: string): void;
  onClear(): void;
}

/**
 * The search field and the chips its query produced.
 *
 * Deliberately does not run `useSmartSearch`: that hook debounces a parse and
 * writes the result into the store, which is state ownership, not presentation.
 * It lives in the connected `SearchBar` alongside the `onFlyTo` callback.
 */
export function SearchBarView({
  query, chips, onQueryChange, onRemoveChip, onClear,
}: SearchBarViewProps) {
  return (
    <div className="pointer-events-auto min-w-0 flex-1">
      {/* h-12 rather than vertical padding: the filters button carries the same
          fixed height, so the two align exactly instead of drifting apart by
          whatever their type happens to measure. */}
      <GlassPanel className="flex h-12 items-center gap-2 px-4">
        <span aria-hidden className="text-ink-300">⌕</span>
        <input
          type="search"
          role="searchbox"
          aria-label={t.searchLabel}
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-ink-900 placeholder:text-ink-300
                     outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={onClear}
            aria-label={t.clearSearch}
            className="grid size-6 place-items-center rounded-full text-ink-300
                       transition-transform duration-200 ease-[var(--ease-spring)]
                       hover:bg-black/5 hover:text-ink-500 active:scale-90"
          >
            ×
          </button>
        )}
      </GlassPanel>

      {chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <ChipPill key={chip.id} label={chip.label} onRemove={() => onRemoveChip(chip.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
