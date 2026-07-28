/**
 * Coalesce rapid calls into one per animation frame, keeping the latest args.
 * Used for map-driven updates, which fire far faster than React should render.
 */
export function rafThrottle<Args extends unknown[]>(
  fn: (...args: Args) => void,
): ((...args: Args) => void) & { cancel(): void } {
  let frame: number | null = null;
  let latest: Args | null = null;

  const throttled = (...args: Args) => {
    latest = args;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (latest) fn(...latest);
    });
  };

  throttled.cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    latest = null;
  };

  return throttled;
}
