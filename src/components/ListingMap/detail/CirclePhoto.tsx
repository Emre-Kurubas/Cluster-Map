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
 * Width and radius are offset rather than run together, and the order flips
 * with direction. Animating both at once puts a 280x200 box under a full
 * radius, which is a stadium — the shape reads as an oval on the way out and
 * again on the way back. Squaring the corners before widening, then narrowing
 * before rounding, keeps every frame either a circle or a rectangle.
 *
 * The two overlap rather than queue: a delay long enough to fully separate them
 * reads as two moves, not one. Radius is well ahead by the time the box has
 * widened enough for the difference to show, which is all it needs to be.
 *
 * The circle is `rounded-[100px]` — exactly half the height — and not
 * `rounded-full`. They look the same at rest, but `rounded-full` is 9999px, and
 * every value above 100px renders identically on a 200px box. Interpolating
 * from 9999 spends the whole transition invisibly crossing that dead range and
 * then snaps through the visible part at the very end. Starting at the real
 * radius makes the corner change track the clock.
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
                 self-center place-items-center rounded-[100px] shadow-xl shadow-ink-900/25
                 [will-change:width] hover:w-[280px] hover:rounded-2xl hover:shadow-2xl
                 focus-visible:w-[280px] focus-visible:rounded-2xl
                 focus-visible:outline-2 focus-visible:outline-offset-4
                 motion-safe:animate-[circle-in_280ms_var(--ease-spring)]
                 xl:size-[240px] xl:rounded-[120px] xl:hover:w-[320px]
                 [transition:width_420ms_var(--ease-smooth),border-radius_260ms_var(--ease-smooth)_200ms,box-shadow_420ms_var(--ease-smooth)]
                 hover:[transition:border-radius_260ms_var(--ease-smooth),width_460ms_var(--ease-smooth)_60ms,box-shadow_460ms_var(--ease-smooth)]
                 focus-visible:[transition:border-radius_260ms_var(--ease-smooth),width_460ms_var(--ease-smooth)_60ms,box-shadow_460ms_var(--ease-smooth)]"
    >
      <span
        // 10px inset each side, so the inner disc is 180px and its own circle
        // radius is 90px — 110px once the outer box is 240px at xl.
        className="absolute inset-[10px] overflow-hidden rounded-[90px] xl:rounded-[110px]
                   group-hover:rounded-xl group-focus-visible:rounded-xl
                   [transition:border-radius_260ms_var(--ease-smooth)_200ms]
                   group-hover:[transition:border-radius_260ms_var(--ease-smooth)]
                   group-focus-visible:[transition:border-radius_260ms_var(--ease-smooth)]"
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
