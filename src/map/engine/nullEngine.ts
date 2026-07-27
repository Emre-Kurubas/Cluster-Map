import type { MapEngine } from '../../types/map';

/**
 * Used when WebGL is unavailable — the UI degrades to the list alone.
 *
 * Every method is a no-op rather than a throw, so the rest of the component
 * carries on unaware: the rail, the filters and the search all work against a
 * map that simply never draws.
 */
export function createNullEngine(): MapEngine {
  const noop = () => {};
  const unsubscribe = () => noop;
  return {
    setData: noop,
    flyToBounds: noop,
    flyToPoint: noop,
    project: () => [0, 0] as [number, number],
    queryVisibleIds: () => [],
    setHovered: noop,
    setSelected: noop,
    zoomIn: noop,
    zoomOut: noop,
    resetView: noop,
    onIdle: unsubscribe,
    onMove: unsubscribe,
    onFeatureClick: unsubscribe,
    onFeatureHover: unsubscribe,
    onClusterClick: unsubscribe,
    destroy: noop,
  };
}
