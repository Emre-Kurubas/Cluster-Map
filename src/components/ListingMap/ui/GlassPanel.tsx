import type { HTMLAttributes, ReactNode } from 'react';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * The single source of the glass treatment.
 *
 * This is the only component in the codebase allowed to declare
 * backdrop-filter. Applying it per-item (list rows, pins, chips) multiplies
 * compositor work and is the usual cause of glassmorphism jank, so the
 * effect is confined to a handful of large, static surfaces.
 */
export function GlassPanel({ className = '', children, ...rest }: GlassPanelProps) {
  return (
    <div
      className={[
        'backdrop-blur-xl bg-white/65 border border-white/60 rounded-2xl',
        'shadow-[0_8px_32px_rgba(34,49,63,0.12),inset_0_1px_0_rgba(255,255,255,0.7)]',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
