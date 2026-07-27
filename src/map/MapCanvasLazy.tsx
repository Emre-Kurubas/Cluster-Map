import { Suspense, lazy } from 'react';
import type { ComponentProps } from 'react';
import type { MapCanvas } from './MapCanvas';

/**
 * The code-split boundary in front of MapLibre.
 *
 * MapLibre is by far the heaviest thing this package touches, and a static
 * import welds it into whatever chunk the consumer's bundler puts
 * `<ListingMap>` in — so importing the component cost them the whole map engine
 * before anything had been rendered. Behind a dynamic import it becomes a chunk
 * of its own, fetched while the rest of the interface is already on screen.
 *
 * `MapCanvas` itself stays exported from the primitives entry. A consumer
 * assembling their own layout picks their own loading strategy, and taking that
 * decision away from them would be a breaking change made on their behalf.
 */
const MapCanvasImpl = lazy(async () => ({
  default: (await import('./MapCanvas')).MapCanvas,
}));

/**
 * The placeholder holds the same box the map will fill.
 *
 * `h-full w-full` and the surface colour, so the chrome laid over the map does
 * not shift when the real canvas arrives — the panels are positioned against
 * this element's box either way.
 */
function MapPlaceholder() {
  return <div className="h-full w-full bg-surface" aria-hidden />;
}

export function MapCanvasLazy(props: ComponentProps<typeof MapCanvas>) {
  return (
    <Suspense fallback={<MapPlaceholder />}>
      <MapCanvasImpl {...props} />
    </Suspense>
  );
}
