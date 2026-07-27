import type { HTMLAttributes, ReactNode } from 'react';
import { GLASS_SURFACE } from './glass';

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * The glass treatment as a container.
 *
 * The declarations themselves live in `glass.ts`, because the filters button
 * and the rail handle need the same surface and cannot wrap themselves in a
 * div. Everything that is a box uses this.
 */
export function GlassPanel({ className = '', children, ...rest }: GlassPanelProps) {
  return (
    <div
      className={[GLASS_SURFACE, 'rounded-2xl', className].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
