import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  /**
   * `solid` is the default chrome button. `ghost` is a near-transparent grey
   * wash for controls that sit directly on the map with nothing behind them.
   */
  tone?: 'solid' | 'ghost';
}

const TONES = {
  solid:
    'bg-white/80 text-ink-500 border-white/60 shadow-sm hover:bg-white hover:text-ink-900',
  ghost:
    'bg-ink-900/10 text-ink-900/70 border-ink-900/5 backdrop-blur-sm ' +
    'hover:bg-ink-900/20 hover:text-ink-900',
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
