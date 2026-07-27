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

// The types those components speak in
export type { Listing, Category } from './types/listing';
export type { Filters, SortMode, Chip as FilterChip } from './types/filters';
export type { MapEngine, BBox, LngLat } from './types/map';
