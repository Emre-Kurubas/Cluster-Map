import { GlassPanel } from '../ui/GlassPanel';
import { IconButton } from '../ui/IconButton';
import { ListingImage } from '../ui/ListingImage';
import { formatPrice } from '../lib/formatPrice';
import { getCategoryConfig } from '../config/categories';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';

export interface ListingDetailViewProps {
  listing: Listing;
  onOpen(listing: Listing): void;
  /** Dismiss the panel. The connected half clears the map's selection. */
  onClose(): void;
}

/** The compact listing panel used below the `md` breakpoint. */
export function ListingDetailView({ listing, onOpen, onClose }: ListingDetailViewProps) {
  // `strongColor`, not `color`: the plain category colours run as low as 2.5:1
  // against white, and this button carries a white label.
  const { swatchClass, strongColor } = getCategoryConfig(listing.category);

  return (
    <GlassPanel
      role="dialog"
      aria-label={listing.title}
      className="pointer-events-auto flex w-80 flex-col gap-3 p-4
                 motion-safe:animate-[detail-in_260ms_var(--ease-spring)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold leading-snug text-ink-900">
          {listing.title}
        </h2>
        <IconButton label={t.closeDetail} onClick={onClose}>
          ×
        </IconButton>
      </div>

      <ListingImage
        listing={listing}
        testId="detail-image"
        fallbackTestId="image-fallback"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70
                         px-2.5 py-1 text-xs font-medium text-ink-500">
          <span className={`size-2 rounded-full ${swatchClass}`} aria-hidden />
          {listing.category}
        </span>
        <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs
                         font-medium text-danger">
          {listing.saleType}
        </span>
      </div>

      <p className="text-xs text-ink-300">{listing.subTitle}</p>
      <p className="text-lg font-bold tabular-nums text-brand-700">
        {formatPrice(listing.price)}
      </p>
      <p className="text-xs leading-relaxed text-ink-500">{listing.description}</p>

      <button
        type="button"
        onClick={() => onOpen(listing)}
        // Category-coloured, matching the pin, the swatch above it and the
        // focus view's CTA — one listing, one colour, wherever it appears.
        style={{ backgroundColor: strongColor }}
        className="mt-1 w-full rounded-xl px-4 py-2.5 text-sm
                   font-semibold text-white transition-[transform,filter]
                   duration-200 ease-[var(--ease-spring)] hover:brightness-110
                   active:scale-[0.98] focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        {t.goToListing}
      </button>
    </GlassPanel>
  );
}
