import { useEffect, useState } from 'react';
import { rafThrottle } from '../lib/throttle';
import type { LngLat, MapEngine } from '../types/map';

export interface PinAnchor { x: number; y: number; onScreen: boolean }

/**
 * How far past the container edge a pin may sit and still count as on screen.
 * Without slack the connector blinks out the instant a pin crosses the border,
 * which reads as a glitch rather than as the pin leaving the view.
 */
const EDGE_MARGIN = 40;

/**
 * The screen position of a listing's pin, kept current as the camera moves.
 *
 * Re-projection is rAF-throttled: MapLibre fires `move` far faster than React
 * should re-render, and a drag would otherwise cost one render per event.
 */
export function usePinAnchor(
  engine: MapEngine | null,
  lngLat: LngLat | null,
  size: { width: number; height: number },
): PinAnchor | null {
  const [anchor, setAnchor] = useState<PinAnchor | null>(null);

  const lng = lngLat?.[0];
  const lat = lngLat?.[1];
  const { width, height } = size;

  useEffect(() => {
    if (!engine || lng === undefined || lat === undefined) {
      setAnchor(null);
      return undefined;
    }

    const read = () => {
      const [x, y] = engine.project([lng, lat]);
      setAnchor({
        x,
        y,
        onScreen:
          x >= -EDGE_MARGIN &&
          y >= -EDGE_MARGIN &&
          x <= width + EDGE_MARGIN &&
          y <= height + EDGE_MARGIN,
      });
    };

    read();

    const throttled = rafThrottle(read);
    const off = engine.onMove(throttled);

    return () => {
      throttled.cancel();
      off();
    };
  }, [engine, lng, lat, width, height]);

  return anchor;
}
