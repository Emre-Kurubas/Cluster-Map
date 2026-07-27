import { useListingStore } from '../store/useListingStore';
import { formatPriceCompact } from '../lib/formatPrice';
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
 * The price range, as one draggable bar with a thumb at each end.
 *
 * It replaced three preset chips and two number fields — three ways to say the
 * same thing, none of which showed where the listings actually sit. The track
 * spans the dataset's real extent, so dragging is bounded by what exists rather
 * than by numbers someone picked in advance.
 *
 * A thumb parked on its end of the domain stores `null`, not that number: "no
 * lower bound" and "the cheapest listing" filter identically today but mean
 * different things, and only the first should count as an active filter.
 */
export function PriceRangeFilter() {
  const priceMin = useListingStore((state) => state.filters.priceMin);
  const priceMax = useListingStore((state) => state.filters.priceMax);
  const domain = useListingStore((state) => state.priceDomain);
  const setPriceRange = useListingStore((state) => state.setPriceRange);

  const hasDomain = domain.max > domain.min;
  const step = hasDomain ? niceStep(domain.max - domain.min) : 1;

  const low = priceMin ?? domain.min;
  const high = priceMax ?? domain.max;

  const percent = (value: number) =>
    hasDomain ? ((value - domain.min) / (domain.max - domain.min)) * 100 : 0;

  /**
   * An untouched end is stored as "no bound" rather than as its own edge.
   *
   * Judged against a step of slack, not against the exact figure. A range input
   * only stops on `min + n × step`, and a real dataset's extent is not a round
   * number — with the shipped data the top stop is 14.793.000 against a maximum
   * of 14.968.000. Comparing exactly meant the upper thumb could never get back
   * to "no bound" once dragged: the filter stayed on at the top of its own
   * track, quietly holding back the dearest listings and keeping a filter in
   * the Filtreler count that the user had no way to see or clear.
   *
   * One step is the right tolerance because it is exactly the gap to the next
   * stop down — the nearest value the user could have meant instead.
   */
  const commit = (nextLow: number, nextHigh: number) =>
    setPriceRange(
      nextLow - domain.min < step ? null : nextLow,
      domain.max - nextHigh < step ? null : nextHigh,
    );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2 tabular-nums">
        <span className="text-sm font-semibold text-ink-900">
          {formatPriceCompact(low)}
        </span>
        <span aria-hidden className="text-xs text-ink-300">—</span>
        <span className="text-sm font-semibold text-ink-900">
          {formatPriceCompact(high)}
        </span>
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
          max={domain.max}
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
          max={domain.max}
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
