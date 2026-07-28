import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

/** Types into one of the two fields and blurs it, which is what commits. */
const type = async (label: string, text: string) => {
  const field = screen.getByLabelText(label);
  await userEvent.clear(field);
  if (text) await userEvent.type(field, text);
  await userEvent.tab();
};

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

  /**
   * The track only stops on the step grid, so a figure someone already has in
   * mind is often not on it at all. The fields are typed against the domain
   * rather than the grid, and land exactly where they are told.
   */
  describe('the typed fields', () => {
    it('shows each bound as grouped digits', () => {
      render(<PriceRangeFilter />);
      expect(screen.getByLabelText(t.priceMinInput)).toHaveValue('500.000');
      expect(screen.getByLabelText(t.priceMaxInput)).toHaveValue('15.000.000');
    });

    it('stores a hand-typed lower bound off the step grid', async () => {
      render(<PriceRangeFilter />);
      await type(t.priceMinInput, '3333333');
      expect(state().filters.priceMin).toBe(3_333_333);
    });

    it('reads back the grouping it prints', async () => {
      render(<PriceRangeFilter />);
      await type(t.priceMaxInput, '4.250.000');
      expect(state().filters.priceMax).toBe(4_250_000);
    });

    it('commits on Enter without waiting for a blur', async () => {
      render(<PriceRangeFilter />);
      await userEvent.clear(screen.getByLabelText(t.priceMinInput));
      await userEvent.type(screen.getByLabelText(t.priceMinInput), '2000000{Enter}');
      expect(state().filters.priceMin).toBe(2_000_000);
    });

    it('puts the stored bound back when the edit is abandoned', async () => {
      render(<PriceRangeFilter />);
      await userEvent.clear(screen.getByLabelText(t.priceMinInput));
      await userEvent.type(screen.getByLabelText(t.priceMinInput), '77{Escape}');
      expect(screen.getByLabelText(t.priceMinInput)).toHaveValue('500.000');
      expect(state().filters.priceMin).toBeNull();
    });

    it('reads an emptied field as no bound at all', async () => {
      render(<PriceRangeFilter />);
      drag(t.priceMaxLabel, 9_000_000);
      await type(t.priceMaxInput, '');
      expect(state().filters.priceMax).toBeNull();
    });

    it('releases the bound when the figure typed is past the end of the data', async () => {
      render(<PriceRangeFilter />);
      drag(t.priceMaxLabel, 9_000_000);
      await type(t.priceMaxInput, '99000000');
      expect(state().filters.priceMax).toBeNull();
    });

    it('holds a typed bound at the other thumb rather than crossing it', async () => {
      render(<PriceRangeFilter />);
      drag(t.priceMaxLabel, 5_000_000);
      await type(t.priceMinInput, '12000000');
      expect(state().filters.priceMin).toBe(5_000_000);
    });

    it('follows a dragged thumb, since only a live edit outranks the store', () => {
      render(<PriceRangeFilter />);
      drag(t.priceMaxLabel, 9_000_000);
      expect(screen.getByLabelText(t.priceMaxInput)).toHaveValue('9.000.000');
    });
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

    /**
     * The upper thumb used to stop at TOP_STOP, one stop short of a track that
     * ran all the way to ODD_MAX — about four pixels of leftover track sitting
     * to the right of a thumb that was meant to be parked on the end. Raising
     * the input's own maximum to the next stop puts a reachable stop at 100%.
     */
    it('ends the track on a stop the thumb can actually reach', () => {
      render(<PriceRangeFilter />);
      const upper = screen.getByLabelText(t.priceMaxLabel);
      const trackMax = Number(upper.getAttribute('max'));
      expect(trackMax).toBeGreaterThanOrEqual(ODD_MAX);
      expect((trackMax - ODD_MIN) % niceStep(ODD_MAX - ODD_MIN)).toBe(0);
      expect(upper).toHaveValue(String(trackMax));
      expect(screen.getByTestId('price-range-fill')).toHaveStyle({ right: '0%' });
    });

    // The track may now end above the data, but the figure on show is the
    // dearest listing there is, not the stop past it.
    it('still prints the dataset maximum rather than the stop past it', () => {
      render(<PriceRangeFilter />);
      expect(screen.getByLabelText(t.priceMaxInput)).toHaveValue('14.968.000');
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
