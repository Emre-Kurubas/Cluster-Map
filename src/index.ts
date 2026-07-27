/**
 * The stylesheet is imported here rather than left for the consumer to
 * remember. Forgetting it yields a silently unstyled map with no error to
 * explain it, which is the worst kind of integration failure. `sideEffects` in
 * package.json keeps a bundler from tree-shaking it away, and
 * `@uyap/listing-map/styles.css` stays exported for anyone who wants to control
 * the order themselves.
 */
import './styles.css';

export { ListingMap } from './ListingMap';
export type { ListingMapProps } from './ListingMap';
export type { Listing, Category } from './types/listing';
