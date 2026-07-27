import { Chip } from '../ui/Chip';
import { useListingStore } from '../store/useListingStore';
import { formatPriceCompact } from '../lib/formatPrice';

const PRESETS = [1_000_000, 3_000_000, 5_000_000] as const;

/** Empty input means "no bound", which is not the same as zero. */
function toBound(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function PriceRangeFilter() {
  const priceMin = useListingStore((state) => state.filters.priceMin);
  const priceMax = useListingStore((state) => state.filters.priceMax);
  const setPriceRange = useListingStore((state) => state.setPriceRange);

  const inputClass =
    'w-28 rounded-lg border border-line bg-white/70 px-2.5 py-1.5 text-sm ' +
    'tabular-nums text-ink-900 outline-none transition-colors duration-200 ' +
    'focus:border-brand-500 focus-visible:outline-2 focus-visible:outline-brand-500';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((preset) => (
        <Chip
          key={preset}
          label={`${formatPriceCompact(preset)} altı`}
          active={priceMax === preset && priceMin === null}
          onClick={() => setPriceRange(null, priceMax === preset ? null : preset)}
        />
      ))}

      <input
        id="price-min"
        type="number"
        inputMode="numeric"
        aria-label="En az"
        placeholder="En az"
        value={priceMin ?? ''}
        onChange={(event) => setPriceRange(toBound(event.target.value), priceMax)}
        className={inputClass}
      />

      <input
        id="price-max"
        type="number"
        inputMode="numeric"
        aria-label="En çok"
        placeholder="En çok"
        value={priceMax ?? ''}
        onChange={(event) => setPriceRange(priceMin, toBound(event.target.value))}
        className={inputClass}
      />
    </div>
  );
}
