import { useStore } from 'zustand';
import { createListingStore } from './createListingStore';
import type { InternalStoreApi, ListingState } from './createListingStore';

export { createListingStore } from './createListingStore';
export { ListingStoreProvider, useListingStoreApi } from './ListingStoreContext';
export type { ListingState, ListingStore } from './createListingStore';

/**
 * TEMPORARY module-scope instance, deleted once every component reads through
 * the provider.
 *
 * Built from the same factory rather than a second `create(...)` call, so there
 * is exactly one definition of the state and its actions while both paths
 * coexist. The `.getState` / `.setState` attachments reproduce the surface
 * zustand's `create` used to hand back, which is what the existing suites call.
 */
const singleton = createListingStore() as unknown as InternalStoreApi;

export function useListingStore<T>(selector: (state: ListingState) => T): T {
  return useStore(singleton, selector);
}

useListingStore.getState = () => singleton.getState();
useListingStore.setState = singleton.setState;
