import { ListingImage } from './ListingImage';
import { IconButton } from './IconButton';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';

interface LightboxProps {
  listing: Listing;
  onClose(): void;
}

/**
 * The listing photo at full size over a dimmed backdrop.
 *
 * Escape is deliberately not handled here: FocusView owns one keydown listener
 * so a single press unwinds exactly one layer. Two handlers would close the
 * lightbox and the focus view together.
 */
export function Lightbox({ listing, onClose }: LightboxProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.listingPhoto}
      className="pointer-events-auto absolute inset-0 z-30 grid place-items-center
                 motion-safe:animate-[lightbox-in_200ms_var(--ease-spring)]"
    >
      {/* Decorative: the IconButton below is the accessible way out, so this
          stays out of the accessibility tree rather than duplicating the label. */}
      <div
        data-testid="lightbox-backdrop"
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 cursor-zoom-out bg-ink-900/70 backdrop-blur-sm"
      />

      <figure className="relative z-10 max-h-[90vh] w-[min(90vw,44rem)]">
        <ListingImage
          listing={listing}
          className="h-[min(70vh,32rem)] w-full"
          iconClassName="size-28"
          testId="lightbox-image"
          fallbackTestId="lightbox-fallback"
        />
      </figure>

      <div className="absolute right-4 top-4 z-10">
        <IconButton label={t.closePhoto} onClick={onClose}>
          ×
        </IconButton>
      </div>
    </div>
  );
}
