/**
 * Kept as a module so the thirteen call sites that already import from here
 * need no edit. The hook itself now lives with the context that backs it.
 *
 * There is deliberately no module-scope store any more: one per `<ListingMap>`
 * is what stops two maps on a page fighting over one set of filters, and what
 * stops a remount restoring whatever the last one was left filtering by.
 */
export {
  useListingStore,
  useListingStoreApi,
  ListingStoreProvider,
} from './ListingStoreContext';
export { createListingStore } from './createListingStore';
export type { ListingState, ListingStore } from './createListingStore';
