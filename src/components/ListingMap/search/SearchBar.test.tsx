import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

describe('SearchBar', () => {
  beforeEach(() => {
    // resetAll deliberately leaves the rail as the user arranged it.
    useListingStore.setState({ railOpen: true });
    useListingStore.getState().resetAll();
  });

  it('renders a labelled search input', () => {
    render(<SearchBar onFlyTo={vi.fn()} />);
    expect(screen.getByRole('searchbox', { name: t.searchLabel })).toBeInTheDocument();
  });

  it('writes what the user types into the store', async () => {
    render(<SearchBar onFlyTo={vi.fn()} />);
    await userEvent.type(screen.getByRole('searchbox'), 'ankara');
    expect(useListingStore.getState().query).toBe('ankara');
  });

  it('turns a parsed query into visible chips', async () => {
    render(<SearchBar onFlyTo={vi.fn()} />);
    await userEvent.type(screen.getByRole('searchbox'), 'ankara 2 milyon alti arsa');
    await waitFor(() => {
      expect(screen.getByText('Ankara')).toBeInTheDocument();
      expect(screen.getByText('≤ 2.000.000 ₺')).toBeInTheDocument();
      expect(screen.getByText('Arsa')).toBeInTheDocument();
    });
  });

  it('flies the map when a province is recognized', async () => {
    const onFlyTo = vi.fn();
    render(<SearchBar onFlyTo={onFlyTo} />);
    await userEvent.type(screen.getByRole('searchbox'), 'ankara');
    await waitFor(() => expect(onFlyTo).toHaveBeenCalled());
    expect(onFlyTo.mock.calls[0][0]).toHaveLength(4);
  });

  it('removes a chip and its filter when the user dismisses it', async () => {
    render(<SearchBar onFlyTo={vi.fn()} />);
    await userEvent.type(screen.getByRole('searchbox'), 'arsa');
    await waitFor(() => expect(screen.getByText('Arsa')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Arsa/ }));
    await waitFor(() =>
      expect(useListingStore.getState().filters.categories).toEqual([]));
  });

  it('clears the query with the clear button', async () => {
    render(<SearchBar onFlyTo={vi.fn()} />);
    await userEvent.type(screen.getByRole('searchbox'), 'ankara');
    await userEvent.click(screen.getByRole('button', { name: t.clearSearch }));
    expect(useListingStore.getState().query).toBe('');
    expect(useListingStore.getState().chips).toEqual([]);
  });

  /**
   * The button says "Aramayı temizle". It used to call resetAll, so it also
   * wiped the price range, the legend exclusions and the sort mode, and shoved
   * the rail back open — none of which live in the field it is attached to.
   */
  it('clears only the search, leaving the rest of the chrome alone', async () => {
    const store = useListingStore.getState();
    store.toggleCategoryVisibility('Arsa');
    store.setPriceRange(100_000, 900_000);
    store.setSort('price-desc');
    store.toggleRail();

    render(<SearchBar onFlyTo={vi.fn()} />);
    await userEvent.type(screen.getByRole('searchbox'), 'ankara');
    await userEvent.click(screen.getByRole('button', { name: t.clearSearch }));

    const after = useListingStore.getState();
    expect(after.query).toBe('');
    expect(after.filters.hiddenCategories).toEqual(['Arsa']);
    expect(after.filters.priceMin).toBe(100_000);
    expect(after.sort).toBe('price-desc');
    expect(after.railOpen).toBe(false);
  });

  it('hides the clear button when the input is empty', () => {
    render(<SearchBar onFlyTo={vi.fn()} />);
    expect(screen.queryByRole('button', { name: t.clearSearch })).toBeNull();
  });
});
