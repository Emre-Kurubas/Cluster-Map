import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as renderBare, screen, act, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { ListingMap } from './ListingMap';
import { ListingMapView } from './ListingMapView';
import { createListingStore } from './store/createListingStore';
import type { ListingStore } from './store/createListingStore';
import { renderWithStore } from './test/renderWithStore';
import { t } from './i18n/tr';
import type { Listing } from './types/listing';

// jsdom has no WebGL; the canvas is irrelevant to what these tests assert.
// The listings it was handed are not — clustering depends on their order.
const mapRenders: Listing[][] = [];
vi.mock('./map/MapCanvas', () => ({
  MapCanvas: ({ listings }: { listings: Listing[] }) => {
    mapRenders.push(listings);
    return <div data-testid="map-canvas" />;
  },
}));

const mapOrder = () => mapRenders[mapRenders.length - 1].map((listing) => listing.id);

const make = (id: number, over: Partial<Listing> = {}): Listing => ({
  id,
  title: `İlan ${id}`,
  subTitle: `Ankara ${id}. İcra Dairesi`,
  description: 'Açıklama',
  price: id * 1_000_000,
  category: 'Arsa',
  saleType: 'İcra',
  location: { lat: 39.9, lng: 32.8 },
  thumbnailUrl: '',
  detailUrl: `/ilan/${id}`,
  ...over,
});

const listings = [make(1), make(2, { category: 'Araç' })];

/** Both the desktop rail and the mobile sheet render, so matches are doubled. */
const firstCard = async (label: string) => (await screen.findAllByText(label))[0];

/**
 * A fresh store per test, injected around `ListingMapView`.
 *
 * These cases drive the map by writing to the store — setting viewport ids,
 * changing the sort — which needs a handle on it. `ListingMap` builds its own
 * store internally and hands it to a provider that shadows any outer one, so
 * the view is what takes an injected store. `ListingMap` itself is four lines
 * of provider wiring, covered by the isolation test at the bottom.
 */
let store: ListingStore = createListingStore();
const render = (ui: ReactElement) => renderWithStore(ui, { store });

describe('ListingMap', () => {
  beforeEach(() => {
    store = createListingStore();
    mapRenders.length = 0;
  });

  it('renders the search bar, filter bar and rail immediately', () => {
    render(<ListingMapView listings={listings} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: t.filters })).toBeInTheDocument();
  });

  /**
   * The chrome is on screen before MapLibre has been fetched — that is the
   * point of the code-split boundary, and the reason this one has to be
   * awaited where the others are not.
   */
  it('resolves the map canvas behind its suspense boundary', async () => {
    render(<ListingMapView listings={listings} />);
    expect(await screen.findByTestId('map-canvas')).toBeInTheDocument();
  });

  it('shows the empty state when given no listings', () => {
    render(<ListingMapView listings={[]} />);
    expect(screen.getAllByText(t.noResults).length).toBeGreaterThan(0);
  });

  it('enters focus mode and hides the chrome when a listing is selected', async () => {
    render(<ListingMapView listings={listings} />);
    store.getState().setVisibleIds([1, 2]);
    await userEvent.click(await firstCard('İlan 1'));

    expect(screen.getByTestId('circle-photo')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('region', { name: t.filters })).toBeNull();
  });

  it('restores the chrome and the rail state when focus mode is closed', async () => {
    render(<ListingMapView listings={listings} />);
    store.getState().setVisibleIds([1, 2]);
    await userEvent.click(await firstCard('İlan 1'));
    await userEvent.click(screen.getByRole('button', { name: t.backToList }));

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(store.getState().railOpen).toBe(true);
    expect(store.getState().selectedId).toBeNull();
  });

  it('calls onListingSelect when a listing is chosen', async () => {
    const onListingSelect = vi.fn();
    render(<ListingMapView listings={listings} onListingSelect={onListingSelect} />);
    store.getState().setVisibleIds([1]);
    await userEvent.click(await firstCard('İlan 1'));
    expect(onListingSelect).toHaveBeenCalledWith(listings[0]);
  });

  it('calls onListingOpen from the focus view CTA and never navigates itself', async () => {
    const onListingOpen = vi.fn();
    render(<ListingMapView listings={listings} onListingOpen={onListingOpen} />);
    store.getState().setVisibleIds([1]);
    await userEvent.click(await firstCard('İlan 1'));
    // Focus view and the sub-md panel both carry the CTA; the first is desktop.
    await userEvent.click(screen.getAllByRole('button', { name: t.goToListing })[0]);
    expect(onListingOpen).toHaveBeenCalledWith(listings[0]);
  });

  // The rail stays mounted so it can animate its width shut; `inert` is what
  // actually takes the collapsed cards out of reach of the keyboard.
  it('collapses the desktop rail and makes it inert when toggled closed', async () => {
    const { container } = render(<ListingMapView listings={listings} />);
    const rail = container.querySelector('#listing-rail');

    expect(rail).not.toHaveAttribute('inert');
    await userEvent.click(screen.getByRole('button', { name: t.closeRail }));

    expect(rail).toHaveAttribute('inert');
    expect(rail).toHaveClass('md:w-0');
    expect(screen.getByRole('button', { name: t.openRail })).toBeInTheDocument();
  });

  it('drops the mobile sheet when the rail is toggled closed', async () => {
    render(<ListingMapView listings={listings} />);
    const before = screen.getAllByText(t.resultCount(0)).length;
    await userEvent.click(screen.getByRole('button', { name: t.closeRail }));
    expect(screen.queryAllByText(t.resultCount(0)).length).toBeLessThan(before);
  });

  it('crosses a category out from the dock without opening anything', async () => {
    render(<ListingMapView listings={listings} />);
    await userEvent.click(screen.getByRole('button', { name: 'Araç' }));
    expect(store.getState().filters.hiddenCategories).toEqual(['Araç']);
  });

  /**
   * Sort reorders the rail. It must not reorder the map source: MapLibre's
   * clustering walks the features in order and lets the first unclaimed point
   * seed a cluster, so a price-sorted array redrew every cluster — different
   * groupings, counts and donut colours — for a control that adds and removes
   * no listings at all.
   */
  describe('sort is a property of the list, not of the map', () => {
    const spread = [
      make(1, { price: 9_000_000, location: { lat: 39.9, lng: 32.8 } }),
      make(2, { price: 1_000_000, location: { lat: 39.91, lng: 32.81 } }),
      make(3, { price: 5_000_000, location: { lat: 41.0, lng: 29.0 } }),
    ];

    it('keeps the map order fixed across every sort mode', async () => {
      render(<ListingMapView listings={spread} />);
      const atRest = mapOrder();

      for (const mode of ['price-asc', 'price-desc', 'relevance'] as const) {
        await act(async () => store.getState().setSort(mode));
        expect(mapOrder(), `sort mode "${mode}" moved the map source`).toEqual(atRest);
      }
    });

    it('gives the map the dataset order, not whatever the rail wants', async () => {
      render(<ListingMapView listings={spread} />);
      await act(async () => store.getState().setSort('price-asc'));
      expect(mapOrder()).toEqual([1, 2, 3]);
    });

    it('still drops filtered-out listings from the map', async () => {
      render(<ListingMapView listings={spread} />);
      await act(async () => store.getState().toggleCategoryVisibility('Arsa'));
      expect(mapOrder()).toEqual([]);
    });
  });

  /**
   * Focus mode is derived from whether the selected id survives the filters, so
   * filtering the selected listing away closed the view but left `selectedId`
   * set. Lifting the filter then reopened focus mode on its own — and because
   * the fly-to effect is keyed on the id, which never changed, it reopened
   * pointing at wherever the camera had drifted to since.
   */
  describe('a selection that the filters drop', () => {
    it('is released rather than parked for later', async () => {
      render(<ListingMapView listings={listings} />);
      store.getState().setVisibleIds([1, 2]);
      await userEvent.click(await firstCard('İlan 1'));
      expect(store.getState().selectedId).toBe(1);

      // Listing 1 is Arsa; crossing that category out drops it.
      await act(async () => store.getState().toggleCategoryVisibility('Arsa'));

      expect(store.getState().selectedId).toBeNull();
      expect(screen.queryByTestId('circle-photo')).toBeNull();
    });

    it('does not spring back into focus mode when the filter is lifted', async () => {
      render(<ListingMapView listings={listings} />);
      store.getState().setVisibleIds([1, 2]);
      await userEvent.click(await firstCard('İlan 1'));

      await act(async () => store.getState().toggleCategoryVisibility('Arsa'));
      await act(async () => store.getState().toggleCategoryVisibility('Arsa'));

      expect(screen.queryByTestId('circle-photo')).toBeNull();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });
  });

  /**
   * The point of scoping the store: a consumer can mount two maps, and phase 1
   * left them sharing one module-scope store, so filtering one filtered both.
   */
  it('gives each mounted map its own filters', async () => {
    // Bare render: each ListingMap builds and provides its own store, which is
    // exactly what this asserts. Wrapping them in a shared one would prove
    // nothing.
    renderBare(
      <>
        <div data-testid="first"><ListingMap listings={listings} /></div>
        <div data-testid="second"><ListingMap listings={listings} /></div>
      </>,
    );

    const first = screen.getByTestId('first');
    await userEvent.click(within(first).getByRole('button', { name: 'Araç' }));

    expect(within(first).getByRole('button', { name: 'Araç' }))
      .toHaveAttribute('aria-pressed', 'false');
    expect(within(screen.getByTestId('second')).getByRole('button', { name: 'Araç' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('hides the category dock in focus mode but keeps the zoom controls', async () => {
    render(<ListingMapView listings={listings} />);
    store.getState().setVisibleIds([1, 2]);
    await userEvent.click(await firstCard('İlan 1'));

    expect(screen.queryByRole('region', { name: t.categories })).toBeNull();
    expect(screen.getByRole('button', { name: t.zoomIn })).toBeInTheDocument();
  });
});
