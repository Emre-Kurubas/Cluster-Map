import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from './FilterBar';
import { createListingStore } from '../store/createListingStore';
import type { ListingStore } from '../store/createListingStore';
import { renderWithStore } from '../test/renderWithStore';
import { t } from '../i18n/tr';

// A fresh store per test, so nothing needs resetting and no test can leak into
// the next by forgetting to.
let store: ListingStore = createListingStore();
const state = () => store.getState();
const render = (ui: ReactElement) => renderWithStore(ui, { store });

const DOMAIN = { min: 500_000, max: 15_000_000 };

/** The controls live behind the toggle now, so every control test opens it. */
async function renderOpen() {
  render(<FilterBar />);
  await userEvent.click(screen.getByTestId('filters-toggle'));
}

/** Range inputs do not respond to typing; a change event is the drag. */
const drag = (label: string, value: number) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value: String(value) } });

describe('FilterBar', () => {
  beforeEach(() => {
    store = createListingStore();
    state().setPriceDomain(DOMAIN.min, DOMAIN.max);
  });

  describe('collapsed by default', () => {
    it('shows only the toggle, keeping the map clear', () => {
      render(<FilterBar />);
      expect(screen.getByTestId('filters-toggle'))
        .toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByLabelText(t.priceMinLabel)).toBeNull();
    });

    it('expands and collapses on click', async () => {
      render(<FilterBar />);
      const toggle = screen.getByTestId('filters-toggle');

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByLabelText(t.priceMinLabel)).toBeInTheDocument();

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByLabelText(t.priceMinLabel)).toBeNull();
    });

    it('reports how many filters are active while it is shut', async () => {
      // Categories are crossed out from CategoryDock now, but the badge still
      // has to account for them - it is the only filter state visible when shut.
      state().toggleCategoryVisibility('Arsa');
      state().toggleCategoryVisibility('Araç');

      render(<FilterBar />);
      expect(screen.getByTestId('filters-toggle')).toHaveTextContent('2');
    });

    it('counts categories and a price bound together', async () => {
      state().toggleCategoryVisibility('Arsa');
      await renderOpen();
      drag(t.priceMaxLabel, 4_000_000);
      expect(screen.getByTestId('filters-toggle')).toHaveTextContent('2');
    });

    it('counts a price bound as one active filter', async () => {
      await renderOpen();
      drag(t.priceMaxLabel, 4_000_000);
      expect(screen.getByTestId('filters-toggle')).toHaveTextContent('1');
    });

    it('shows no count when nothing is filtered', () => {
      render(<FilterBar />);
      expect(screen.getByTestId('filters-toggle')).not.toHaveTextContent('0');
    });
  });

  describe('controls', () => {
    it('leaves the category toggles to CategoryDock', async () => {
      await renderOpen();
      expect(screen.queryByRole('button', { name: 'Arsa' })).toBeNull();
    });

    it('applies a dragged upper bound', async () => {
      await renderOpen();
      drag(t.priceMaxLabel, 3_000_000);
      expect(state().filters.priceMax).toBe(3_000_000);
      expect(state().filters.priceMin).toBeNull();
    });

    it('applies a dragged lower bound', async () => {
      await renderOpen();
      drag(t.priceMinLabel, 2_000_000);
      expect(state().filters.priceMin).toBe(2_000_000);
      expect(state().filters.priceMax).toBeNull();
    });

    it('treats a thumb parked on its end of the domain as no bound at all', async () => {
      await renderOpen();
      drag(t.priceMinLabel, 2_000_000);
      drag(t.priceMinLabel, DOMAIN.min);
      expect(state().filters.priceMin).toBeNull();
    });

    it('changes the sort mode', async () => {
      await renderOpen();
      await userEvent.click(screen.getByRole('radio', { name: t.sortPriceDesc }));
      expect(state().sort).toBe('price-desc');
    });

    it('marks the current sort mode as checked', async () => {
      await renderOpen();
      expect(screen.getByRole('radio', { name: t.sortRelevance }))
        .toHaveAttribute('aria-checked', 'true');
    });

    it('resets everything with the reset button', async () => {
      state().toggleCategoryVisibility('Arsa');
      await renderOpen();
      drag(t.priceMaxLabel, 3_000_000);
      await userEvent.click(screen.getByRole('button', { name: t.clearFilters }));
      expect(state().filters.hiddenCategories).toEqual([]);
      expect(state().filters.priceMax).toBeNull();
    });

    it('keeps the price domain across a reset - it describes the data, not a choice', async () => {
      await renderOpen();
      drag(t.priceMaxLabel, 3_000_000);
      await userEvent.click(screen.getByRole('button', { name: t.clearFilters }));
      expect(state().priceDomain).toEqual(DOMAIN);
    });

    it('hides the reset button when nothing is filtered', async () => {
      await renderOpen();
      expect(screen.queryByRole('button', { name: t.clearFilters })).toBeNull();
    });
  });
});
