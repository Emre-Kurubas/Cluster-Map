/**
 * The stylesheet is imported here rather than left for the consumer to
 * remember. Forgetting it yields a silently unstyled map with no error to
 * explain it, which is the worst kind of integration failure. `sideEffects` in
 * package.json keeps a bundler from tree-shaking it away, and
 * `cluster-map/styles.css` stays exported for anyone who wants to control
 * the order themselves.
 */
import './styles.css';

export { ListingMap } from './ListingMap';
export type { ListingMapProps } from './ListingMap';
// So `slots` is typeable without reaching for the primitives entry. Types only:
// the runtime surface of this entry stays exactly `ListingMap`.
export type { ListingMapSlots, Slot } from './slots';
export type { Listing, Category } from './types/listing';
