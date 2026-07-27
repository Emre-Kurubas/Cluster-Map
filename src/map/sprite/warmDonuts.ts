import type { Map as MapLibreMap } from 'maplibre-gl';
import { donutMixes, drawDonutSprite } from './donutShapes';

/**
 * How many sprites to decode per slot of background time.
 *
 * They are decoded together rather than one at a time because the expensive
 * part of each is an image decode the browser does off the main thread — a
 * batch costs barely more wall-clock than a single sprite, and the whole set
 * finishes in nine slots instead of sixty-six.
 */
const BATCH = 8;

/**
 * Upper bound on how long a slot may be deferred.
 *
 * Idle time is not guaranteed to arrive: a page that stays busy would otherwise
 * never warm a single sprite, which is the one case where warming matters most.
 */
const SLOT_TIMEOUT_MS = 500;

/**
 * One slot of background time — idle if the browser offers it, a task if not.
 *
 * jsdom has no `requestIdleCallback`, and neither do older Safaris, so the
 * fallback is not hypothetical.
 */
function nextSlot(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: SLOT_TIMEOUT_MS });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Decode the remaining cluster sprites in the background, and return a cancel.
 *
 * Drawing donuts on demand is what got the first paint down from 69 sprite
 * decodes to three, and that is worth keeping. But the on-demand path has a
 * cost that only shows up later: MapLibre awaits the missing-image resolver
 * before it will finish parsing a tile, so the first time a zoom reveals a
 * cluster mix nobody has drawn yet, the *whole tile* waits on an SVG decode.
 * Until it lands, the map keeps drawing the tile it came from — which is the
 * cluster the user just clicked, still sitting there after the zoom has
 * stopped.
 *
 * So: draw them on demand for the first paint, then quietly fill in the rest
 * while nothing is happening. By the time anyone clicks a cluster, the sprite
 * its children need is already in the atlas and the tile parses immediately.
 *
 * The work is spread over idle slots rather than run in one go: it is entirely
 * speculative, and none of it should ever compete with a frame the user is
 * waiting on.
 */
export function warmDonutSprites(map: MapLibreMap): () => void {
  let cancelled = false;

  void (async () => {
    const mixes = donutMixes();
    for (let index = 0; index < mixes.length; index += BATCH) {
      await nextSlot();
      // The map can be removed at any point in here — this outlives no single
      // frame — and drawing into a torn-down style would throw from a promise
      // nobody is holding.
      if (cancelled) return;

      await Promise.all(
        mixes.slice(index, index + BATCH)
          .map(([gayrimenkul, arsa]) => drawDonutSprite(map, gayrimenkul, arsa)),
      );
    }
  })();

  return () => { cancelled = true; };
}
