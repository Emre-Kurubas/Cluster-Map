import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { ListingMapView } from './ListingMapView';
import { createListingStore } from './store/createListingStore';
import type { ListingStore } from './store/createListingStore';
import { renderWithStore } from './test/renderWithStore';
import type { Listing } from './types/listing';
import type { MapEngine } from './types/map';

/** How many times ListingMapView's subtree rendered. */
let renders = 0;
const engine = {
  setHovered: vi.fn(),
  setSelected: vi.fn(),
  flyToPoint: vi.fn(),
  flyToBounds: vi.fn(),
  resetView: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  setData: vi.fn(),
  project: vi.fn(() => [0, 0] as [number, number]),
  queryVisibleIds: vi.fn(() => []),
  onIdle: vi.fn(() => () => {}),
  onMove: vi.fn(() => () => {}),
  onFeatureClick: vi.fn(() => () => {}),
  onFeatureHover: vi.fn(() => () => {}),
  onClusterClick: vi.fn(() => () => {}),
  destroy: vi.fn(),
} as unknown as MapEngine;

// The canvas counts renders and hands the view a ready engine synchronously.
vi.mock('./map/MapCanvasLazy', () => ({
  MapCanvasLazy: ({ onEngineReady }: { onEngineReady(e: MapEngine): void }) => {
    renders += 1;
    return <button type="button" data-testid="ready" onClick={() => onEngineReady(engine)} />;
  },
}));

const make = (id: number): Listing => ({
  id,
  title: `İlan ${id}`,
  subTitle: 'Ankara 1. İcra Dairesi',
  description: 'Açıklama',
  price: id * 1_000_000,
  category: 'Arsa',
  saleType: 'İcra',
  location: { lat: 39.9, lng: 32.8 },
  thumbnailUrl: '',
  detailUrl: `/ilan/${id}`,
});

const listings = [make(1), make(2)];

let store: ListingStore;

/**
 * Hover fires as fast as the pointer moves, and every pin-to-pin transition
 * used to re-render the whole ListingMapView subtree just to hand the id back
 * to the engine that raised it — a round trip through React to reach the thing
 * that already knew.
 */
describe('hover reaches the engine without a render', () => {
  beforeEach(() => {
    store = createListingStore();
    renders = 0;
    vi.clearAllMocks();
  });

  const mount = () => {
    const result = renderWithStore(<ListingMapView listings={listings} />, { store });
    act(() => { result.getByTestId('ready').click(); });
    return result;
  };

  it('pushes the hovered id down to the engine', () => {
    mount();
    act(() => store.getState().hover(7));
    expect(engine.setHovered).toHaveBeenCalledWith(7);
  });

  it('costs no re-render of the view', () => {
    mount();
    const before = renders;
    // The engine arriving syncs whatever the store already holds; count from
    // after that, since it is one call per engine rather than per hover.
    const pushedOnMount = vi.mocked(engine.setHovered).mock.calls.length;

    act(() => store.getState().hover(1));
    act(() => store.getState().hover(2));
    act(() => store.getState().hover(null));

    expect(renders - before, 'hover re-rendered the view').toBe(0);
    expect(vi.mocked(engine.setHovered).mock.calls.length - pushedOnMount).toBe(3);
  });

  // Zustand notifies on every write, so the subscription has to filter for the
  // one field it cares about or an unrelated store change would flip the
  // highlight to a value that had not changed.
  it('ignores store changes that are not hover', () => {
    mount();
    const pushed = vi.mocked(engine.setHovered).mock.calls.length;

    act(() => store.getState().setSort('price-desc'));
    act(() => store.getState().setVisibleIds([1, 2]));

    expect(vi.mocked(engine.setHovered).mock.calls.length).toBe(pushed);
  });

  // Selection is different: focus mode genuinely depends on it, so it keeps its
  // subscription and is expected to re-render.
  it('still re-renders for a selection, which focus mode depends on', () => {
    mount();
    const before = renders;
    act(() => store.getState().select(1));
    expect(renders).toBeGreaterThan(before);
  });
});
