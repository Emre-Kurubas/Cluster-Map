import { useListingStore } from '../store/useListingStore';
import { GLASS_SURFACE } from '../ui/glass';
import { t } from '../i18n/tr';

/**
 * The rail's expand/collapse handle.
 *
 * It used to be a free-floating square button that sat top-aligned beside the
 * rail and jumped to the far left when the rail closed — nothing tied it to the
 * panel it controlled. Now it is a tab fused to the rail's trailing edge:
 * vertically centred, riding the panel when it opens and closing flush against
 * the viewport edge when it shuts, so its position always states where the rail
 * is and which way it will move.
 */
export function RailToggle() {
  const railOpen = useListingStore((state) => state.railOpen);
  const toggleRail = useListingStore((state) => state.toggleRail);

  return (
    <button
      type="button"
      onClick={toggleRail}
      aria-label={railOpen ? t.closeRail : t.openRail}
      title={railOpen ? t.closeRail : t.openRail}
      aria-expanded={railOpen}
      aria-controls="listing-rail"
      className={[
        'pointer-events-auto group relative z-10 grid h-20 w-5 shrink-0 self-center',
        'place-items-center rounded-r-lg border-l-0',
        GLASS_SURFACE,
        'transition-[background-color,width] duration-200 ease-[var(--ease-spring)]',
        'hover:w-6 hover:bg-white',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        // Open at md+: butt up against the rail so the two read as one
        // surface. Otherwise cancel the overlay's inset and grip the viewport
        // edge — below md there is no rail beside it to attach to.
        '-ml-3',
        railOpen ? 'md:-ml-px' : 'md:-ml-4',
      ].join(' ')}
    >
      <Chevron
        className={`size-3.5 text-ink-500 transition-transform duration-300
                    ease-[var(--ease-spring)] group-hover:text-ink-900
                    ${railOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

/** Points right by default; the button rotates it to point back at the rail. */
function Chevron({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}
