import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

describe('SearchBar', () => {
  beforeEach(() => useListingStore.getState().resetAll());

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

  it('hides the clear button when the input is empty', () => {
    render(<SearchBar onFlyTo={vi.fn()} />);
    expect(screen.queryByRole('button', { name: t.clearSearch })).toBeNull();
  });
});
