import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CirclePhoto } from './CirclePhoto';
import { FocusHeader } from './FocusHeader';
import { PinConnector } from './PinConnector';
import { usePinAnchor } from './usePinAnchor';
import { Lightbox } from '../ui/Lightbox';
import { IconButton } from '../ui/IconButton';
import { formatPrice } from '../lib/formatPrice';
import { getCategoryConfig } from '../config/categories';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';
import type { Circle } from './lineEndpoints';
import type { Listing } from '../types/listing';
import type { MapEngine } from '../types/map';

interface FocusViewProps {
  listing: Listing;
  engine: MapEngine | null;
  /** The map container's pixel size, used to decide if the pin is on screen. */
  size: { width: number; height: number };
  onOpen(listing: Listing): void;
}

/**
 * The full-surface view for a single listing.
 *
 * Owns the lightbox and the one Escape handler for both layers, and measures
 * the circle so PinConnector can stay pure.
 */
export function FocusView({ listing, engine, size, onOpen }: FocusViewProps) {
  const select = useListingStore((state) => state.select);
  const { swatchClass } = getCategoryConfig(listing.category);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [circle, setCircle] = useState<Circle | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLButtonElement>(null);

  const anchor = usePinAnchor(
    engine,
    [listing.location.lng, listing.location.lat],
    size,
  );

  /**
   * Re-measure whenever the pin moves. The hover morph changes the circle's
   * width mid-drag, so a measurement taken once on mount would detach the line
   * from the shape's edge.
   */
  const measure = useCallback(() => {
    const photo = photoRef.current;
    const wrapper = wrapperRef.current;
    if (!photo || !wrapper) return;

    const box = photo.getBoundingClientRect();
    const origin = wrapper.getBoundingClientRect();
    setCircle({
      cx: box.left - origin.left + box.width / 2,
      cy: box.top - origin.top + box.height / 2,
      r: Math.min(box.width, box.height) / 2,
    });
  }, []);

  useLayoutEffect(() => { measure(); }, [measure, anchor]);

  // One listener for both layers, so a press unwinds exactly one of them.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (lightboxOpen) setLightboxOpen(false);
      else select(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, select]);

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute inset-0">
      <PinConnector
        circle={circle}
        pin={anchor ? { x: anchor.x, y: anchor.y } : null}
        visible={anchor?.onScreen ?? false}
      />

      <div className="pointer-events-auto absolute left-3 top-3 md:left-4 md:top-4 z-20">
        <IconButton label={t.backToList} onClick={() => select(null)}>
          ×
        </IconButton>
      </div>

      <div className="absolute inset-x-0 top-4 flex justify-center px-24">
        <FocusHeader listing={listing} />
      </div>

      <div className="absolute left-6 top-[22%] z-20 flex flex-col gap-5 xl:left-10">
        <CirclePhoto
          listing={listing}
          innerRef={photoRef}
          onOpen={() => setLightboxOpen(true)}
        />

        <div
          className="pointer-events-auto flex w-[22rem] max-w-[calc(100vw-3rem)]
                     flex-col gap-2.5 rounded-2xl bg-ink-900/35 p-4 text-white
                     backdrop-blur-md
                     motion-safe:animate-[focus-body-in_300ms_var(--ease-spring)_120ms_backwards]"
        >
          <h2 className="text-base font-semibold leading-snug">{listing.title}</h2>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15
                             px-2.5 py-1 text-xs font-medium">
              <span className={`size-2 rounded-full ${swatchClass}`} aria-hidden />
              {listing.category}
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
              {listing.saleType}
            </span>
          </div>

          <p className="text-xs text-white/70">{listing.subTitle}</p>
          <p className="text-xl font-bold tabular-nums">{formatPrice(listing.price)}</p>
          <p className="text-xs leading-relaxed text-white/80">{listing.description}</p>

          <button
            type="button"
            onClick={() => onOpen(listing)}
            className="mt-1 w-full rounded-xl bg-brand-700 px-4 py-2.5 text-sm
                       font-semibold text-white transition-transform duration-200
                       ease-[var(--ease-spring)] hover:bg-brand-900 active:scale-[0.98]
                       focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-white"
          >
            {t.goToListing}
          </button>
        </div>
      </div>

      {lightboxOpen && (
        <Lightbox listing={listing} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}
