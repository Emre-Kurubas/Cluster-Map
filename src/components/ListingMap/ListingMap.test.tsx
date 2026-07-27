import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListingMap } from './ListingMap';
import { useListingStore } from './store/useListingStore';
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

describe('ListingMap', () => {
  beforeEach(() => {
    // resetAll deliberately leaves the rail as the user arranged it, so the
    // suite puts it back itself.
    useListingStore.setState({ railOpen: true });
    useListingStore.getState().resetAll();
    mapRenders.length = 0;
  });

  it('renders the search bar, filter bar, rail and map', () => {
    render(<ListingMap listings={listings} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: t.filters })).toBeInTheDocument();
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
  });

  it('shows the empty state when given no listings', () => {
    render(<ListingMap listings={[]} />);
    expect(screen.getAllByText(t.noResults).length).toBeGreaterThan(0);
  });

  it('enters focus mode and hides the chrome when a listing is selected', async () => {
    render(<ListingMap listings={listings} />);
    useListingStore.getState().setVisibleIds([1, 2]);
    await userEvent.click(await firstCard('İlan 1'));

    expect(screen.getByTestId('circle-photo')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('region', { name: t.filters })).toBeNull();
  });

  it('restores the chrome and the rail state when focus mode is closed', async () => {
    render(<ListingMap listings={listings} />);
    useListingStore.getState().setVisibleIds([1, 2]);
    await userEvent.click(await firstCard('İlan 1'));
    await userEvent.click(screen.getByRole('button', { name: t.backToList }));

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(useListingStore.getState().railOpen).toBe(true);
    expect(useListingStore.getState().selectedId).toBeNull();
  });

  it('calls onListingSelect when a listing is chosen', async () => {
    const onListingSelect = vi.fn();
    render(<ListingMap listings={listings} onListingSelect={onListingSelect} />);
    useListingStore.getState().setVisibleIds([1]);
    await userEvent.click(await firstCard('İlan 1'));
    expect(onListingSelect).toHaveBeenCalledWith(listings[0]);
  });

  it('calls onListingOpen from the focus view CTA and never navigates itself', async () => {
    const onListingOpen = vi.fn();
    render(<ListingMap listings={listings} onListingOpen={onListingOpen} />);
    useListingStore.getState().setVisibleIds([1]);
    await userEvent.click(await firstCard('İlan 1'));
    // Focus view and the sub-md panel both carry the CTA; the first is desktop.
    await userEvent.click(screen.getAllByRole('button', { name: t.goToListing })[0]);
    expect(onListingOpen).toHaveBeenCalledWith(listings[0]);
  });

  // The rail stays mounted so it can animate its width shut; `inert` is what
  // actually takes the collapsed cards out of reach of the keyboard.
  it('collapses the desktop rail and makes it inert when toggled closed', async () => {
    const { container } = render(<ListingMap listings={listings} />);
    const rail = container.querySelector('#listing-rail');

    expect(rail).not.toHaveAttribute('inert');
    await userEvent.click(screen.getByRole('button', { name: t.closeRail }));

    expect(rail).toHaveAttribute('inert');
    expect(rail).toHaveClass('md:w-0');
    expect(screen.getByRole('button', { name: t.openRail })).toBeInTheDocument();
  });

  it('drops the mobile sheet when the rail is toggled closed', async () => {
    render(<ListingMap listings={listings} />);
    const before = screen.getAllByText(t.resultCount(0)).length;
    await userEvent.click(screen.getByRole('button', { name: t.closeRail }));
    expect(screen.queryAllByText(t.resultCount(0)).length).toBeLessThan(before);
  });

  it('crosses a category out from the dock without opening anything', async () => {
    render(<ListingMap listings={listings} />);
    await userEvent.click(screen.getByRole('button', { name: 'Araç' }));
    expect(useListingStore.getState().filters.hiddenCategories).toEqual(['Araç']);
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
      render(<ListingMap listings={spread} />);
      const atRest = mapOrder();

      for (const mode of ['price-asc', 'price-desc', 'relevance'] as const) {
        await act(async () => useListingStore.getState().setSort(mode));
        expect(mapOrder(), `sort mode "${mode}" moved the map source`).toEqual(atRest);
      }
    });

    it('gives the map the dataset order, not whatever the rail wants', async () => {
      render(<ListingMap listings={spread} />);
      await act(async () => useListingStore.getState().setSort('price-asc'));
      expect(mapOrder()).toEqual([1, 2, 3]);
    });

    it('still drops filtered-out listings from the map', async () => {
      render(<ListingMap listings={spread} />);
      await act(async () => useListingStore.getState().toggleCategoryVisibility('Arsa'));
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
      render(<ListingMap listings={listings} />);
      useListingStore.getState().setVisibleIds([1, 2]);
      await userEvent.click(await firstCard('İlan 1'));
      expect(useListingStore.getState().selectedId).toBe(1);

      // Listing 1 is Arsa; crossing that category out drops it.
      await act(async () => useListingStore.getState().toggleCategoryVisibility('Arsa'));

      expect(useListingStore.getState().selectedId).toBeNull();
      expect(screen.queryByTestId('circle-photo')).toBeNull();
    });

    it('does not spring back into focus mode when the filter is lifted', async () => {
      render(<ListingMap listings={listings} />);
      useListingStore.getState().setVisibleIds([1, 2]);
      await userEvent.click(await firstCard('İlan 1'));

      await act(async () => useListingStore.getState().toggleCategoryVisibility('Arsa'));
      await act(async () => useListingStore.getState().toggleCategoryVisibility('Arsa'));

      expect(screen.queryByTestId('circle-photo')).toBeNull();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });
  });

  it('hides the category dock in focus mode but keeps the zoom controls', async () => {
    render(<ListingMap listings={listings} />);
    useListingStore.getState().setVisibleIds([1, 2]);
    await userEvent.click(await firstCard('İlan 1'));

    expect(screen.queryByRole('region', { name: t.categories })).toBeNull();
    expect(screen.getByRole('button', { name: t.zoomIn })).toBeInTheDocument();
  });
});
