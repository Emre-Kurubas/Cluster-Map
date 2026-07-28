import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import type { InternalStoreApi, ListingState, ListingStore } from './createListingStore';

const StoreContext = createContext<InternalStoreApi | null>(null);

const MISSING_PROVIDER =
  '[ListingMap] useListingStore was called outside a <ListingStoreProvider>. ' +
  'Render your tree inside <ListingMap>, or mount ' +
  '<ListingStoreProvider store={createListingStore()}> yourself.';

export function ListingStoreProvider(
  { store, children }: { store: ListingStore; children: ReactNode },
) {
  // The one cast in the codebase. `ListingStore` is the narrowed public face of
  // this same object; the context needs the real api in order to subscribe.
  return (
    <StoreContext.Provider value={store as unknown as InternalStoreApi}>
      {children}
    </StoreContext.Provider>
  );
}

/**
 * Subscribe to a slice of the surrounding map's state.
 *
 * Same call shape as the module-scope hook it replaces, which is what lets the
 * thirteen existing call sites carry on unedited.
 */
export function useListingStore<T>(selector: (state: ListingState) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error(MISSING_PROVIDER);
  return useStore(store, selector);
}

/**
 * The store itself, for imperative reads outside render.
 *
 * MapCanvas needs this: it pulls its actions once inside an effect rather than
 * subscribing to them, so that panning the map costs no React work at all.
 */
export function useListingStoreApi(): ListingStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error(MISSING_PROVIDER);
  return store as unknown as ListingStore;
}
