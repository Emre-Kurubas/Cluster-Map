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

describe('the primitives entry point', () => {
  it.each([...CONNECTED, ...PURE, ...ALREADY_PURE, ...STATE])('exports %s', (name) => {
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
