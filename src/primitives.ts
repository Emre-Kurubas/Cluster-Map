/**
 * Composable parts, for consumers who want a different layout around the same
 * behaviour. `<ListingMap>` from the main entry is the assembled version, and
 * is what most consumers should reach for.
 *
 * Naming: `X` reads the surrounding store and needs a `<ListingStoreProvider>`
 * above it; `XView` is pure, takes props and renders anywhere. Components that
 * never touched the store have no `View` twin — inventing one would be
 * ceremony. `FocusViewView` is that rule applied consistently, not a typo.
 */
import './styles.css';

// Search and filters
export { SearchBar } from './search/SearchBar';
export { SearchBarView } from './search/SearchBarView';
export type { SearchBarViewProps } from './search/SearchBarView';
export { FilterBar } from './filters/FilterBar';
export { FilterBarView } from './filters/FilterBarView';
export type { FilterBarViewProps } from './filters/FilterBarView';
export { FilterPanel } from './filters/FilterPanel';
export { FilterPanelView } from './filters/FilterPanelView';
export type { FilterPanelViewProps } from './filters/FilterPanelView';
export { PriceRangeFilter, niceStep } from './filters/PriceRangeFilter';
export { PriceRangeFilterView } from './filters/PriceRangeFilterView';
export type { PriceRangeFilterViewProps } from './filters/PriceRangeFilterView';
export { CategoryFilter } from './filters/CategoryFilter';
export { CategoryFilterView } from './filters/CategoryFilterView';
export type { CategoryFilterViewProps } from './filters/CategoryFilterView';
export { SortControl } from './filters/SortControl';
export { SortControlView } from './filters/SortControlView';
export type { SortControlViewProps } from './filters/SortControlView';

// List and detail
export { ResultsRail } from './list/ResultsRail';
export { ResultsRailView } from './list/ResultsRailView';
export type { ResultsRailViewProps } from './list/ResultsRailView';
export { ListingCard } from './list/ListingCard';
export { ListingDetail } from './detail/ListingDetail';
export { ListingDetailView } from './detail/ListingDetailView';
export type { ListingDetailViewProps } from './detail/ListingDetailView';
export { FocusView } from './detail/FocusView';
export { FocusViewView } from './detail/FocusViewView';
export type { FocusViewViewProps } from './detail/FocusViewView';

// Map and chrome
export { MapCanvas } from './map/MapCanvas';
export { MapCanvasView } from './map/MapCanvasView';
export type { MapCanvasViewProps } from './map/MapCanvasView';
export { MapControls } from './controls/MapControls';
export { CategoryDock } from './controls/CategoryDock';
export { RailToggle } from './controls/RailToggle';
export { RailToggleView } from './controls/RailToggleView';
export type { RailToggleViewProps } from './controls/RailToggleView';
export { ErrorNotice } from './controls/ErrorNotice';

// UI kit
export { GlassPanel } from './ui/GlassPanel';
export { Chip } from './ui/Chip';
export { IconButton } from './ui/IconButton';
export { Lightbox } from './ui/Lightbox';
export { ListingImage } from './ui/ListingImage';

/**
 * The derivation the assembled component runs before it renders anything.
 *
 * `<ListingMap>` turns raw listings into the filtered, sorted set the rail
 * shows and the dataset-ordered set the map clusters, and it keeps selection,
 * hover and the camera in step. A consumer building their own layout needs the
 * same work done and has no way to reproduce it — the search index alone is
 * Turkish normalization, intent parsing and bounded fuzzy matching.
 */
export { useFilteredListings } from './hooks/useFilteredListings';
export type { FilteredListings } from './hooks/useFilteredListings';
export { useContainerSize } from './hooks/useContainerSize';
export type { Size } from './hooks/useContainerSize';
export { useMapSelection } from './hooks/useMapSelection';
export { useSmartSearch } from './search/useSmartSearch';

// State
export { ListingStoreProvider, useListingStore, useListingStoreApi } from './store/ListingStoreContext';
export { createListingStore } from './store/createListingStore';
export type { ListingState, ListingStore } from './store/createListingStore';

/**
 * Category colours and sprite ids. Anyone building chrome of their own from
 * these primitives needs them, or their controls will not match the pins.
 */
export { CATEGORIES, CATEGORY_LIST, getCategoryConfig } from './config/categories';
export type { CategoryConfig } from './config/categories';

/**
 * Slots, for anyone who wants `<ListingMap>`'s layout with different contents.
 *
 * The prop types come with them: a replacement is a drop-in for the connected
 * component it stands in for, so it should be typed against that component's
 * props rather than restating them.
 */
export { resolveSlot } from './slots';
export type { Slot, ListingMapSlots } from './slots';
export type { SearchBarProps } from './search/SearchBar';
export type { ResultsRailProps } from './list/ResultsRail';
export type { MapControlsProps } from './controls/MapControls';
export type { ErrorNoticeProps } from './controls/ErrorNotice';
export type { FocusViewProps } from './detail/FocusView';
export type { ListingDetailProps } from './detail/ListingDetail';

// The types those components speak in
export type { Listing, Category } from './types/listing';
export type { Filters, SortMode, Chip as FilterChip } from './types/filters';
export type { MapEngine, BBox, LngLat } from './types/map';
