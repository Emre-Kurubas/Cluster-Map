import { useState } from 'react';
import { formatAmount, parseAmount } from '../lib/formatPrice';
import { t } from '../i18n/tr';

/** Step sizes the slider is allowed to land on, coarsest that still feels fine. */
const STEPS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

/**
 * A step that gives the track roughly a hundred stops, rounded to a figure a
 * person would actually say out loud.
 */
export function niceStep(range: number): number {
  const target = range / 100;
  return STEPS.find((step) => step >= target) ?? STEPS[STEPS.length - 1];
}

/**
 * The end of the track, raised to the next stop on the step grid.
 *
 * A range input only lands on `min + n × step`, so an upper end that is not
 * itself a stop is one the thumb can never reach: with the shipped extent it
 * stopped 175.000 short of 14.968.000, about four pixels, which showed as a
 * sliver of track left over on the right of a thumb that was supposed to be
 * parked at the end. Raising the input's own maximum to the next stop puts a
 * reachable stop exactly at 100%; the figure the fields print is still the
 * dataset's real maximum, which is what `clamp` below is for.
 */
export function gridMax(min: number, max: number, step: number): number {
  return min + Math.ceil((max - min) / step) * step;
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), high);

export interface PriceRangeFilterViewProps {
  priceMin: number | null;
  priceMax: number | null;
  domain: { min: number; max: number };
  /** Called with the bounds already resolved: an untouched end arrives as null. */
  onChange(min: number | null, max: number | null): void;
}

/**
 * The price range, as one draggable bar with a thumb at each end and the two
 * figures above it typed directly.
 *
 * It replaced three preset chips and two number fields — three ways to say the
 * same thing, none of which showed where the listings actually sit. The track
 * spans the dataset's real extent, so dragging is bounded by what exists rather
 * than by numbers someone picked in advance. The fields came back because the
 * track cannot say everything: it stops only on the step grid, and a bound
 * someone already has in mind is quicker to type than to hunt for.
 *
 * A thumb parked on its end of the domain stores `null`, not that number: "no
 * lower bound" and "the cheapest listing" filter identically today but mean
 * different things, and only the first should count as an active filter.
 */
export function PriceRangeFilterView({
  priceMin, priceMax, domain, onChange,
}: PriceRangeFilterViewProps) {
  const hasDomain = domain.max > domain.min;
  const step = hasDomain ? niceStep(domain.max - domain.min) : 1;
  const trackMax = hasDomain ? gridMax(domain.min, domain.max, step) : domain.max;

  const low = priceMin ?? domain.min;
  const high = priceMax ?? trackMax;

  const percent = (value: number) =>
    hasDomain ? ((value - domain.min) / (trackMax - domain.min)) * 100 : 0;

  /**
   * An untouched end is stored as "no bound" rather than as its own edge.
   *
   * Judged against a step of slack, not against the exact figure. The track's
   * topmost stop now sits at or above `domain.max` rather than below it, but a
   * bound within one step of the end is still one the user cannot distinguish
   * from "everything" — one step is exactly the gap to the next stop down, the
   * nearest value they could have meant instead.
   */
  const commit = (nextLow: number, nextHigh: number) =>
    onChange(
      nextLow - domain.min < step ? null : nextLow,
      domain.max - nextHigh < step ? null : nextHigh,
    );

  return (
    <div className="flex flex-col gap-2.5">
      {/* Typed against the domain, not the track: nobody should have to enter a
          figure rounded up to a step, and an end left empty means no bound. */}
      <div className="flex items-center justify-between gap-1.5">
        <PriceField
          label={t.priceMinInput}
          value={low}
          disabled={!hasDomain}
          onCommit={(typed) => commit(clamp(typed ?? domain.min, domain.min, high), high)}
        />
        <span aria-hidden className="text-xs text-ink-300">—</span>
        <PriceField
          label={t.priceMaxInput}
          value={Math.min(high, domain.max)}
          disabled={!hasDomain}
          onCommit={(typed) => commit(low, clamp(typed ?? domain.max, low, domain.max))}
        />
      </div>

      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        <div
          data-testid="price-range-fill"
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-500"
          style={{ left: `${percent(low)}%`, right: `${100 - percent(high)}%` }}
        />

        <input
          type="range"
          className="range-thumb"
          aria-label={t.priceMinLabel}
          min={domain.min}
          max={trackMax}
          step={step}
          disabled={!hasDomain}
          value={low}
          // Never past the other thumb: a crossed pair would read as an
          // inverted range and quietly match nothing.
          onChange={(event) => commit(Math.min(Number(event.target.value), high), high)}
          // Raised once it is in the upper half, where the two thumbs meet and
          // the one underneath becomes impossible to grab.
          style={{ zIndex: percent(low) > 50 ? 4 : 3 }}
        />
        <input
          type="range"
          className="range-thumb"
          aria-label={t.priceMaxLabel}
          min={domain.min}
          max={trackMax}
          step={step}
          disabled={!hasDomain}
          value={high}
          onChange={(event) => commit(low, Math.max(Number(event.target.value), low))}
          style={{ zIndex: 3 }}
        />
      </div>
    </div>
  );
}

interface PriceFieldProps {
  label: string;
  value: number;
  disabled: boolean;
  /** Null when the field was left empty, which reads as "no bound this end". */
  onCommit(typed: number | null): void;
}

/**
 * One end of the range, typed.
 *
 * Holds what is being typed in a draft of its own and only reports on blur or
 * Enter. Reporting every keystroke would filter the map against each prefix of
 * the number — "1" before "1.500.000" — and each of those writes would come
 * straight back as a reformatted value, moving the caret out from under the
 * next character. With no draft the field simply prints the bound, so dragging
 * a thumb keeps the figure above it up to date.
 */
function PriceField({ label, value, disabled, onCommit }: PriceFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const settle = (text: string | null) => {
    setDraft(null);
    if (text !== null) onCommit(parseAmount(text));
  };

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-1 rounded-lg border border-line
                 px-2 py-1 transition-colors duration-200
                 focus-within:border-brand-500 focus-within:bg-brand-100/40"
    >
      <input
        inputMode="numeric"
        aria-label={label}
        disabled={disabled}
        value={draft ?? formatAmount(value)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => settle(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') settle(draft);
          // Abandons the edit and puts the stored bound back on screen.
          if (event.key === 'Escape') setDraft(null);
        }}
        className="w-full min-w-0 bg-transparent text-sm font-semibold tabular-nums
                   text-ink-900 outline-none disabled:text-ink-300"
      />
      <span aria-hidden className="shrink-0 text-xs text-ink-300">
        {t.currencySymbol}
      </span>
    </div>
  );
}
