import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  /**
   * `solid` is the default chrome button. `ghost` has no surface at all — dark
   * ink straight on the map, legible through a text shadow rather than a plate.
   */
  tone?: 'solid' | 'ghost';
}

const TONES = {
  solid:
    'bg-white/80 text-ink-500 border-white/60 shadow-sm hover:bg-white hover:text-ink-900',
  ghost:
    'border-transparent bg-transparent text-lg font-semibold text-ink-900 ' +
    '[text-shadow:0_1px_3px_rgb(255_255_255/0.9),0_0_10px_rgb(255_255_255/0.7)] ' +
    'hover:bg-ink-900/10',
} as const;

export function IconButton({
  label,
  children,
  tone = 'solid',
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        'grid size-9 place-items-center rounded-xl border',
        'transition-[transform,background-color,color] duration-200',
        'ease-[var(--ease-spring)] will-change-transform active:scale-90',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        TONES[tone],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
