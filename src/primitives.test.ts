import { describe, it, expect } from 'vitest';
import * as primitives from './primitives';
import * as main from './index';

/**
 * The export list is the package's contract. Asserting it here means removing
 * or renaming an export fails the suite rather than a consumer's build.
 */
const CONNECTED = [
  'SearchBar', 'FilterBar', 'FilterPanel', 'PriceRangeFilter', 'CategoryFilter',
  'SortControl', 'ResultsRail', 'ListingDetail', 'FocusView', 'MapCanvas',
  'RailToggle',
];

const PURE = CONNECTED.map((name) => `${name}View`);

/** Never read the store, so a View twin would be ceremony. */
const ALREADY_PURE = [
  'ListingCard', 'MapControls', 'CategoryDock',
  'GlassPanel', 'Chip', 'IconButton', 'Lightbox', 'ListingImage',
];

const STATE = ['ListingStoreProvider', 'createListingStore', 'useListingStore'];

/** Category colours, so consumer-built chrome can match the pins. */
const CONFIG = ['CATEGORIES', 'CATEGORY_LIST', 'getCategoryConfig'];

/**
 * The derivation `<ListingMap>` runs on its way to the components below it.
 * Without these, composing a layout out of the primitives means rebuilding the
 * search index, the filters and the sort by hand — which is most of what the
 * package is for. They were extracted as hooks in 786c1b0 and never exported.
 */
const HOOKS = [
  'useFilteredListings', 'useContainerSize', 'useMapSelection', 'useSmartSearch',
];

describe('the primitives entry point', () => {
  it.each([...CONNECTED, ...PURE, ...ALREADY_PURE, ...STATE, ...CONFIG, ...HOOKS])('exports %s', (name) => {
    expect(primitives).toHaveProperty(name);
  });

  it.each(ALREADY_PURE)('does not invent a View twin for %s', (name) => {
    expect(primitives).not.toHaveProperty(`${name}View`);
  });
});

describe('the main entry point', () => {
  // Types are erased, so this sees runtime values only.
  it('stays narrow', () => {
    expect(Object.keys(main).sort()).toEqual(['ListingMap']);
  });
});
