import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createListingStore } from './createListingStore';
import { ListingStoreProvider, useListingStore } from './ListingStoreContext';

function SortLabel() {
  const sort = useListingStore((state) => state.sort);
  return <span data-testid="sort">{sort}</span>;
}

describe('ListingStoreContext', () => {
  it('reads state from the store the provider was given', () => {
    const store = createListingStore();
    render(
      <ListingStoreProvider store={store}>
        <SortLabel />
      </ListingStoreProvider>,
    );
    expect(screen.getByTestId('sort')).toHaveTextContent('relevance');
  });

  it('re-renders the subscriber when that store changes', () => {
    const store = createListingStore();
    render(
      <ListingStoreProvider store={store}>
        <SortLabel />
      </ListingStoreProvider>,
    );
    act(() => store.getState().setSort('price-desc'));
    expect(screen.getByTestId('sort')).toHaveTextContent('price-desc');
  });

  // The whole point of the phase: two mounted maps must not share filters.
  it('keeps two stores independent', () => {
    const a = createListingStore();
    const b = createListingStore();
    a.getState().setSort('price-asc');
    expect(a.getState().sort).toBe('price-asc');
    expect(b.getState().sort).toBe('relevance');
  });

  /**
   * Reachable as soon as the primitives are public: a consumer can import
   * SearchBar and render it anywhere. The message has to name the fix, because
   * the alternative is a null dereference deep inside zustand.
   */
  it('names the fix when used outside a provider', () => {
    expect(() => render(<SortLabel />)).toThrow(/ListingStoreProvider/);
  });
});
