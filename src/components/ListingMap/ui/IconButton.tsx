import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, children, className = '', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[
        'grid size-9 place-items-center rounded-xl bg-white/80 text-ink-500',
        'border border-white/60 shadow-sm transition-transform duration-200',
        'ease-[var(--ease-spring)] will-change-transform',
        'hover:bg-white hover:text-ink-900 active:scale-90',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
