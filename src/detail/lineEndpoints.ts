export interface Circle { cx: number; cy: number; r: number }
export interface Point { x: number; y: number }
export interface Segment { x1: number; y1: number; x2: number; y2: number }

/**
 * The segment from a circle's edge to a pin.
 *
 * Returns null when there is nothing sensible to draw: the pin is inside the
 * circle, sits exactly on its centre, or the circle has not been measured yet
 * (radius 0 before the first layout pass). Callers render nothing in that case
 * rather than a zero-length or inverted line.
 */
export function lineEndpoints(circle: Circle, pin: Point): Segment | null {
  if (circle.r <= 0) return null;

  const dx = pin.x - circle.cx;
  const dy = pin.y - circle.cy;
  const distance = Math.hypot(dx, dy);
  if (distance <= circle.r) return null;

  return {
    x1: circle.cx + (dx / distance) * circle.r,
    y1: circle.cy + (dy / distance) * circle.r,
    x2: pin.x,
    y2: pin.y,
  };
}
