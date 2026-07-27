import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { createListingStore } from '../store/createListingStore';
import type { ListingStore } from '../store/createListingStore';
import { ListingStoreProvider } from '../store/ListingStoreContext';

type Options = Omit<RenderOptions, 'wrapper'> & { store?: ListingStore };

/**
 * Render a subject inside its own store.
 *
 * Replaces the `useListingStore.getState().resetAll()` every suite used to run
 * in `beforeEach`: a fresh store per test needs no reset, and tests can no
 * longer leak state into one another by forgetting one.
 */
export function renderWithStore(
  ui: ReactElement,
  { store = createListingStore(), ...options }: Options = {},
): RenderResult & { store: ListingStore } {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ListingStoreProvider store={store}>{children}</ListingStoreProvider>
  );
  return { store, ...render(ui, { wrapper: Wrapper, ...options }) };
}
