import { memo } from 'react';
import { formatPrice } from '../lib/formatPrice';
import { getCategoryConfig } from '../config/categories';
import type { Listing } from '../types/listing';

interface ListingCardProps {
  listing: Listing;
  selected: boolean;
  onSelect(id: number): void;
  onHover(id: number | null): void;
}

/**
 * Memoized: the rail re-renders on every viewport change, but an individual
 * card's props are stable unless its selection state actually flips.
 * No backdrop-filter here — see the GlassPanel note.
 */
export const ListingCard = memo(function ListingCard({
  listing, selected, onSelect, onHover,
}: ListingCardProps) {
  const { swatchClass } = getCategoryConfig(listing.category);

  return (
    <button
      type="button"
      aria-current={selected}
      onClick={() => onSelect(listing.id)}
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(listing.id)}
      onBlur={() => onHover(null)}
      className={[
        'w-full rounded-xl border px-3 py-2.5 text-left',
        'transition-[transform,background-color,border-color] duration-200',
        'ease-[var(--ease-spring)] will-change-transform',
        'hover:-translate-y-0.5 focus-visible:outline-2',
        'focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        selected
          ? 'border-brand-500 bg-brand-100'
          : 'border-transparent bg-white/70 hover:bg-white',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${swatchClass}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p
            data-testid="listing-title"
            className="truncate text-sm font-semibold text-ink-900"
          >
            {listing.title}
          </p>
          <p className="truncate text-xs text-ink-300">{listing.subTitle}</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-brand-700">
            {formatPrice(listing.price)}
          </p>
        </div>
      </div>
    </button>
  );
});
