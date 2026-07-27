import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from './FilterBar';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

const state = () => useListingStore.getState();

/** Cheapest control still inside the panel, used to prove it opened. */
const PRICE_PRESET = '1 mn ₺ altı';

/** The controls live behind the toggle now, so every control test opens it. */
async function renderOpen() {
  render(<FilterBar />);
  await userEvent.click(screen.getByTestId('filters-toggle'));
}

describe('FilterBar', () => {
  beforeEach(() => state().resetAll());

  describe('collapsed by default', () => {
    it('shows only the toggle, keeping the map clear', () => {
      render(<FilterBar />);
      expect(screen.getByTestId('filters-toggle'))
        .toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: PRICE_PRESET })).toBeNull();
    });

    it('expands and collapses on click', async () => {
      render(<FilterBar />);
      const toggle = screen.getByTestId('filters-toggle');

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: PRICE_PRESET })).toBeInTheDocument();

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: PRICE_PRESET })).toBeNull();
    });

    it('reports how many filters are active while it is shut', async () => {
      // Categories are toggled from CategoryDock now, but the badge still has
      // to account for them - it is the only filter state visible when shut.
      state().toggleCategory('Arsa');
      state().toggleCategory('Araç');

      render(<FilterBar />);
      expect(screen.getByTestId('filters-toggle')).toHaveTextContent('2');
    });

    it('counts categories and a price bound together', async () => {
      state().toggleCategory('Arsa');
      await renderOpen();
      await userEvent.click(screen.getByRole('button', { name: PRICE_PRESET }));
      expect(screen.getByTestId('filters-toggle')).toHaveTextContent('2');
    });

    it('counts a price bound as one active filter', async () => {
      await renderOpen();
      await userEvent.click(screen.getByRole('button', { name: PRICE_PRESET }));
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

    it('applies a price preset', async () => {
      await renderOpen();
      await userEvent.click(screen.getByRole('button', { name: PRICE_PRESET }));
      expect(state().filters.priceMax).toBe(1_000_000);
      expect(state().filters.priceMin).toBeNull();
    });

    it('applies typed price bounds', async () => {
      await renderOpen();
      await userEvent.type(screen.getByLabelText('En az'), '500000');
      await userEvent.type(screen.getByLabelText('En çok'), '3000000');
      expect(state().filters.priceMin).toBe(500_000);
      expect(state().filters.priceMax).toBe(3_000_000);
    });

    it('treats an emptied price field as no bound rather than zero', async () => {
      await renderOpen();
      const min = screen.getByLabelText('En az');
      await userEvent.type(min, '500000');
      await userEvent.clear(min);
      expect(state().filters.priceMin).toBeNull();
    });

    it('changes the sort mode', async () => {
      await renderOpen();
      await userEvent.selectOptions(screen.getByLabelText(t.sort), 'price-desc');
      expect(state().sort).toBe('price-desc');
    });

    it('resets everything with the reset button', async () => {
      state().toggleCategory('Arsa');
      await renderOpen();
      await userEvent.click(screen.getByRole('button', { name: PRICE_PRESET }));
      await userEvent.click(screen.getByRole('button', { name: t.clearFilters }));
      expect(state().filters.categories).toEqual([]);
      expect(state().filters.priceMax).toBeNull();
    });

    it('hides the reset button when nothing is filtered', async () => {
      await renderOpen();
      expect(screen.queryByRole('button', { name: t.clearFilters })).toBeNull();
    });
  });
});
