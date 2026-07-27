import { useSmartSearch } from './useSmartSearch';
import { useListingStore } from '../store/useListingStore';
import { GlassPanel } from '../ui/GlassPanel';
import { Chip } from '../ui/Chip';
import { t } from '../i18n/tr';
import type { BBox } from '../types/map';

interface SearchBarProps {
  onFlyTo(bbox: BBox): void;
}

export function SearchBar({ onFlyTo }: SearchBarProps) {
  useSmartSearch(onFlyTo);

  const query = useListingStore((state) => state.query);
  const chips = useListingStore((state) => state.chips);
  const setQuery = useListingStore((state) => state.setQuery);
  const removeChip = useListingStore((state) => state.removeChip);
  const resetAll = useListingStore((state) => state.resetAll);

  return (
    <div className="pointer-events-auto min-w-0 flex-1">
      <GlassPanel className="flex items-center gap-2 px-4 py-2.5">
        <span aria-hidden className="text-ink-300">⌕</span>
        <input
          type="search"
          role="searchbox"
          aria-label={t.searchLabel}
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-ink-900 placeholder:text-ink-300
                     outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={resetAll}
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
            <Chip key={chip.id} label={chip.label} onRemove={() => removeChip(chip.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
