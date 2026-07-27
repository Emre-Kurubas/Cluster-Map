import { SOURCE_ID } from '../config/mapStyle';

/**
 * Failed requests tolerated after the style is up before the basemap counts as
 * unavailable. A view change can drop a few tiles and still paint correctly.
 */
export const TILE_FAILURE_THRESHOLD = 6;

/** Only request failures speak to the basemap's availability. */
const NETWORK_MESSAGE = /tile|source|fetch|network|load/i;

export interface TileErrorReporter {
  /** Feed one MapLibre `error` event. */
  report(event: unknown, styleLoaded: boolean): void;
  /** Feed one finished render cycle (MapLibre `idle`). */
  settle(): void;
}

/**
 * Decides when a MapLibre error means "the basemap is unavailable".
 *
 * A single failed request does not. MapLibre aborts in-flight tiles on every
 * fly and pan, and one dropped request out of hundreds used to raise a
 * permanent banner over a map that was drawing fine. So: before the style is
 * up, one failure already means there is no basemap; after it is up, it takes a
 * sustained run of them. A render cycle that finishes without a single failure
 * retracts the notice — nothing else could, and it outlived its outage.
 *
 * Split out of createMapEngine because this is the only part of the engine that
 * can be exercised without WebGL, and it is the part that was wrong.
 */
export function createTileErrorReporter(
  onError: () => void,
  onRecover: () => void,
  threshold: number = TILE_FAILURE_THRESHOLD,
): TileErrorReporter {
  let failuresThisCycle = 0;
  let failuresSinceRecovery = 0;

  return {
    report(event, styleLoaded) {
      const { sourceId, error } = (event ?? {}) as {
        sourceId?: string;
        error?: { message?: string };
      };

      // Our own listings source failing is our bug, not the network's.
      if (sourceId === SOURCE_ID) return;
      if (!NETWORK_MESSAGE.test(String(error?.message ?? ''))) return;

      failuresThisCycle += 1;
      failuresSinceRecovery += 1;
      if (!styleLoaded || failuresSinceRecovery >= threshold) onError();
    },

    settle() {
      if (failuresThisCycle === 0 && failuresSinceRecovery > 0) {
        failuresSinceRecovery = 0;
        onRecover();
      }
      failuresThisCycle = 0;
    },
  };
}
