import { describe, it, expect } from 'vitest';
import listingMapView from '../ListingMapView.tsx?raw';
import mapCanvasLazy from './MapCanvasLazy.tsx?raw';
import primitives from '../primitives.ts?raw';

/**
 * MapLibre is the heaviest thing this package touches, and a consumer who
 * renders `<ListingMap>` should not pay for it before the map is on screen.
 *
 * Asserted against the source rather than the bundle: a static
 * `import ... from './MapCanvas'` anywhere on the path from ListingMapView is
 * what welds MapLibre into the entry chunk, and that is the thing to prevent.
 * The bundle-level proof lives in build/package.test.ts.
 */
describe('the map canvas boundary', () => {
  it('is reached through a dynamic import, not a static one', () => {
    // \b after MapCanvas does not match inside MapCanvasLazy, which is the
    // whole point: importing the wrapper statically is fine and expected.
    expect(listingMapView).not.toMatch(/^import\s+\{[^}]*\bMapCanvas\b[^}]*\}\s+from/m);
    expect(listingMapView).toContain('MapCanvasLazy');
  });

  it('keeps the dynamic import inside the lazy wrapper', () => {
    expect(mapCanvasLazy).toMatch(/lazy\(/);
    expect(mapCanvasLazy).toMatch(/await import\(|=>\s*import\(/);
    // A type-only import does not pull the module into the graph.
    expect(mapCanvasLazy).toMatch(/import type \{ MapCanvas \}/);
  });

  /**
   * The eager export stays: a consumer composing their own layout out of the
   * primitives picks their own loading strategy, and taking that decision away
   * would be a breaking change made on their behalf.
   */
  it('still exports the eager component from the primitives entry', () => {
    expect(primitives).toContain("export { MapCanvas } from './map/MapCanvas'");
  });
});
