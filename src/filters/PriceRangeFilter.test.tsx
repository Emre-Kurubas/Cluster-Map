import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { PriceRangeFilter, niceStep } from './PriceRangeFilter';
import { createListingStore } from '../store/createListingStore';
import type { ListingStore } from '../store/createListingStore';
import { renderWithStore } from '../test/renderWithStore';
import { t } from '../i18n/tr';

// A fresh store per test, so nothing needs resetting and no test can leak into
// the next by forgetting to.
let store: ListingStore = createListingStore();
const state = () => store.getState();
const render = (ui: ReactElement) => renderWithStore(ui, { store });

const MIN = 500_000;
const MAX = 15_000_000;

const drag = (label: string, value: number) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } });

describe('niceStep', () => {
  it('gives the track about a hundred stops', () => {
    expect(niceStep(10_000_000)).toBe(100_000);
  });

  it('rounds up to a figure a person would say out loud', () => {
    expect(niceStep(1_450_000)).toBe(25_000);
  });

  it('never returns zero, however narrow the domain', () => {
    expect(niceStep(1)).toBeGreaterThan(0);
  });
});

describe('PriceRangeFilter', () => {
  beforeEach(() => {
    store = createListingStore();
    state().setPriceDomain(MIN, MAX);
  });

  it('spans the dataset with both thumbs at rest on the ends', () => {
    render(<PriceRangeFilter />);
    expect(screen.getByLabelText(t.priceMinLabel)).toHaveValue(String(MIN));
    expect(screen.getByLabelText(t.priceMaxLabel)).toHaveValue(String(MAX));
  });

  it('stores a dragged lower bound', () => {
    render(<PriceRangeFilter />);
    drag(t.priceMinLabel, 4_000_000);
    expect(state().filters.priceMin).toBe(4_000_000);
  });

  it('stores a dragged upper bound', () => {
    render(<PriceRangeFilter />);
    drag(t.priceMaxLabel, 9_000_000);
    expect(state().filters.priceMax).toBe(9_000_000);
  });

  // "No lower bound" and "the cheapest listing" filter identically today but
  // mean different things, and only the first should count as an active filter.
  it('stores an untouched end as no bound rather than as its own edge', () => {
    render(<PriceRangeFilter />);
    drag(t.priceMaxLabel, 9_000_000);
    expect(state().filters.priceMin).toBeNull();
  });

  it('releases a bound again when its thumb returns to the end', () => {
    render(<PriceRangeFilter />);
    drag(t.priceMaxLabel, 9_000_000);
    drag(t.priceMaxLabel, MAX);
    expect(state().filters.priceMax).toBeNull();
  });

  describe('the thumbs cannot cross', () => {
    it('holds the lower thumb at the upper one', () => {
      render(<PriceRangeFilter />);
      drag(t.priceMaxLabel, 5_000_000);
      drag(t.priceMinLabel, 12_000_000);
      expect(state().filters.priceMin).toBe(5_000_000);
      expect(state().filters.priceMax).toBe(5_000_000);
    });

    it('holds the upper thumb at the lower one', () => {
      render(<PriceRangeFilter />);
      drag(t.priceMinLabel, 9_000_000);
      drag(t.priceMaxLabel, 2_000_000);
      expect(state().filters.priceMax).toBe(9_000_000);
    });
  });

  /**
   * A range input only lands on `min + n × step`, and a real dataset's extent
   * is not a round number. The upper end of the domain is therefore usually
   * *not* a stop the thumb can reach: with the shipped data (543.000 –
   * 14.968.000, step 250.000) the topmost stop is 14.793.000. Comparing the
   * thumb against `domain.max` exactly then never released the bound again, so
   * the two dearest listings stayed filtered out and the Filtreler badge kept
   * counting a filter the user could not see or clear.
   *
   * The suite missed it because MIN/MAX above are round enough to sit on the
   * grid; these use the real extent instead.
   */
  describe('with a domain whose ends are not on the step grid', () => {
    const ODD_MIN = 543_000;
    const ODD_MAX = 14_968_000;
    /** niceStep(14_425_000) — the highest stop below ODD_MAX. */
    const TOP_STOP = 14_793_000;

    beforeEach(() => state().setPriceDomain(ODD_MIN, ODD_MAX));

    it('releases the upper bound when the thumb reaches its topmost stop', () => {
      render(<PriceRangeFilter />);
      drag(t.priceMaxLabel, 9_000_000);
      drag(t.priceMaxLabel, TOP_STOP);
      expect(state().filters.priceMax).toBeNull();
    });

    it('still holds a bound the user dragged well clear of the end', () => {
      render(<PriceRangeFilter />);
      drag(t.priceMaxLabel, 9_000_000);
      expect(state().filters.priceMax).toBe(9_000_000);
    });

    it('keeps the lower end exact, which is always on the grid', () => {
      render(<PriceRangeFilter />);
      drag(t.priceMinLabel, 4_000_000);
      expect(state().filters.priceMin).toBe(4_000_000);
      drag(t.priceMinLabel, ODD_MIN);
      expect(state().filters.priceMin).toBeNull();
    });
  });

  describe('with no listings to describe', () => {
    beforeEach(() => state().setPriceDomain(0, 0));

    it('disables both thumbs rather than offering an empty track', () => {
      render(<PriceRangeFilter />);
      expect(screen.getByLabelText(t.priceMinLabel)).toBeDisabled();
      expect(screen.getByLabelText(t.priceMaxLabel)).toBeDisabled();
    });

    it('draws no fill, and divides by nothing while doing it', () => {
      render(<PriceRangeFilter />);
      expect(screen.getByTestId('price-range-fill')).toHaveStyle({ left: '0%' });
    });
  });
});
