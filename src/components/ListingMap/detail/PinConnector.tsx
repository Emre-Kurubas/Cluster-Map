import { lineEndpoints } from './lineEndpoints';
import type { Circle, Point } from './lineEndpoints';

interface PinConnectorProps {
  /** Container-relative geometry of the circle photo. */
  circle: Circle | null;
  /** Container-relative screen position of the listing's pin. */
  pin: Point | null;
  /** False once the pin has panned off screen. */
  visible: boolean;
}

/**
 * The thin line tying the circle photo to its pin on the map.
 *
 * Pure presentation: FocusView measures both ends and passes numbers, so the
 * geometry is testable without a layout engine.
 */
export function PinConnector({ circle, pin, visible }: PinConnectorProps) {
  const segment = circle && pin ? lineEndpoints(circle, pin) : null;
  if (!segment) return null;

  return (
    <svg
      data-testid="pin-connector"
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-10 h-full w-full
                  transition-opacity duration-200 ${visible ? 'opacity-70' : 'opacity-0'}`}
    >
      <line
        data-testid="pin-connector-line"
        x1={segment.x1}
        y1={segment.y1}
        x2={segment.x2}
        y2={segment.y2}
        stroke="var(--color-brand-500)"
        strokeWidth={1.5}
        strokeLinecap="round"
        // Normalised length, so one dash pattern draws any distance.
        pathLength={1}
        className="motion-safe:animate-[connector-draw_400ms_var(--ease-spring)_200ms_backwards]"
      />
      <circle
        data-testid="pin-connector-dot"
        cx={segment.x2}
        cy={segment.y2}
        r={4}
        fill="var(--color-brand-500)"
      />
    </svg>
  );
}
