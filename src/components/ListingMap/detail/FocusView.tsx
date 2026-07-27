import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
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

interface FieldProps {
  label: string;
  children: ReactNode;
  /**
   * Puts the value on its own line. Long prose does not fit the two-column
   * rhythm the short fields use.
   */
  stacked?: boolean;
}

/** One label/value row of the details list, hairline-separated from the next. */
function Field({ label, children, stacked = false }: FieldProps) {
  return (
    <div
      className={`border-t border-white/10 py-2 text-xs first:border-t-0 first:pt-0 ${
        stacked ? 'flex flex-col gap-1' : 'flex items-baseline justify-between gap-4'
      }`}
    >
      <dt className="shrink-0 text-white/55">{label}</dt>
      <dd
        className={`text-white ${
          stacked ? 'leading-relaxed text-white/85' : 'text-right'
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

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

  /**
   * Leaving focus mode also returns the camera. Selecting flew the map to a
   * single listing at street zoom; dropping back to the list with the map still
   * there would strand the user somewhere they never navigated to.
   */
  const close = useCallback(() => {
    engine?.resetView();
    select(null);
  }, [engine, select]);

  // One listener for both layers, so a press unwinds exactly one of them.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (lightboxOpen) setLightboxOpen(false);
      else close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, close]);

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute inset-0">
      <PinConnector
        circle={circle}
        pin={anchor ? { x: anchor.x, y: anchor.y } : null}
        visible={anchor?.onScreen ?? false}
      />

      <div className="pointer-events-auto absolute left-3 top-3 z-20 md:left-4 md:top-4">
        <IconButton tone="ghost" label={t.backToList} onClick={close}>
          ×
        </IconButton>
      </div>

      <div className="absolute inset-x-0 top-4 flex justify-center px-24">
        <FocusHeader listing={listing} />
      </div>

      <div className="absolute left-6 top-[10%] z-20 flex flex-col gap-5 xl:left-10">
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

          <dl data-testid="focus-fields" className="flex flex-col">
            <Field label={t.fieldCategory}>
              <span className="inline-flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${swatchClass}`} aria-hidden />
                {listing.category}
              </span>
            </Field>
            <Field label={t.fieldSaleType}>{listing.saleType}</Field>
            <Field label={t.fieldOffice}>{listing.subTitle}</Field>
            <Field label={t.fieldPrice}>
              <span className="font-bold tabular-nums">
                {formatPrice(listing.price)}
              </span>
            </Field>
            <Field label={t.fieldDescription} stacked>
              {listing.description}
            </Field>
          </dl>

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
