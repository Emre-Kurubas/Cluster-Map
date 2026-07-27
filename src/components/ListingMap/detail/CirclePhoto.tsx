import type { Ref } from 'react';
import { ListingImage } from '../ui/ListingImage';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';

interface CirclePhotoProps {
  listing: Listing;
  onOpen(): void;
  /** The listing's category colour, matching its pin and the connector line. */
  color: string;
  /** So FocusView can measure the disc and anchor the connector to its edge. */
  innerRef?: Ref<HTMLButtonElement>;
}

/**
 * The listing photo as a colour-ringed disc that morphs to a rectangle on hover.
 *
 * The colour is a ring rather than a wash behind the photo: the fallback
 * artwork draws the category pin in that same colour, which would vanish
 * against a solid field of it.
 *
 * Width and radius are staggered rather than run together, and the order flips
 * with direction. Animating both at once puts a 280x200 box under a full
 * radius, which is a stadium — the shape reads as an oval on the way out and
 * again on the way back. Squaring the corners before widening, then narrowing
 * before rounding, keeps every frame either a circle or a rectangle.
 */
export function CirclePhoto({ listing, onOpen, color, innerRef }: CirclePhotoProps) {
  return (
    <button
      ref={innerRef}
      type="button"
      data-testid="circle-photo"
      aria-label={t.openPhoto}
      title={t.openPhoto}
      onClick={onOpen}
      style={{ backgroundColor: color, outlineColor: color }}
      className="group pointer-events-auto relative grid size-[200px] shrink-0
                 place-items-center rounded-full shadow-xl shadow-ink-900/25
                 hover:w-[280px] hover:rounded-2xl hover:shadow-2xl
                 focus-visible:w-[280px] focus-visible:rounded-2xl
                 focus-visible:outline-2 focus-visible:outline-offset-4
                 motion-safe:animate-[circle-in_280ms_var(--ease-spring)]
                 xl:size-[240px] xl:hover:w-[320px]
                 [transition:width_260ms_var(--ease-spring),border-radius_180ms_var(--ease-spring)_180ms,box-shadow_320ms_var(--ease-spring)]
                 hover:[transition:border-radius_180ms_var(--ease-spring),width_260ms_var(--ease-spring)_140ms,box-shadow_320ms_var(--ease-spring)]
                 focus-visible:[transition:border-radius_180ms_var(--ease-spring),width_260ms_var(--ease-spring)_140ms,box-shadow_320ms_var(--ease-spring)]"
    >
      <span
        className="absolute inset-[10px] overflow-hidden rounded-full
                   group-hover:rounded-xl group-focus-visible:rounded-xl
                   [transition:border-radius_180ms_var(--ease-spring)_180ms]
                   group-hover:[transition:border-radius_180ms_var(--ease-spring)]
                   group-focus-visible:[transition:border-radius_180ms_var(--ease-spring)]"
      >
        <ListingImage
          listing={listing}
          className="h-full w-full"
          iconClassName="size-16"
          testId="circle-image"
          fallbackTestId="circle-fallback"
        />
      </span>
    </button>
  );
}
