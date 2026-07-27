import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListingMap } from './ListingMap';
import { useListingStore } from './store/useListingStore';
import { t } from './i18n/tr';
import type { Listing } from './types/listing';

// jsdom has no WebGL; the canvas is irrelevant to what these tests assert.
vi.mock('./map/MapCanvas', () => ({
  MapCanvas: () => <div data-testid="map-canvas" />,
}));

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
  beforeEach(() => useListingStore.getState().resetAll());

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

  it('opens the detail card for the selected listing', async () => {
    render(<ListingMap listings={listings} />);
    useListingStore.getState().setVisibleIds([1, 2]);
    await userEvent.click(await firstCard('İlan 1'));
    expect(screen.getByRole('dialog', { name: 'İlan 1' })).toBeInTheDocument();
  });

  it('calls onListingSelect when a listing is chosen', async () => {
    const onListingSelect = vi.fn();
    render(<ListingMap listings={listings} onListingSelect={onListingSelect} />);
    useListingStore.getState().setVisibleIds([1]);
    await userEvent.click(await firstCard('İlan 1'));
    expect(onListingSelect).toHaveBeenCalledWith(listings[0]);
  });

  it('calls onListingOpen from the detail CTA and never navigates itself', async () => {
    const onListingOpen = vi.fn();
    render(<ListingMap listings={listings} onListingOpen={onListingOpen} />);
    useListingStore.getState().setVisibleIds([1]);
    await userEvent.click(await firstCard('İlan 1'));
    await userEvent.click(screen.getByRole('button', { name: t.goToListing }));
    expect(onListingOpen).toHaveBeenCalledWith(listings[0]);
  });

  it('hides the desktop rail when it is toggled closed', async () => {
    render(<ListingMap listings={listings} />);
    const before = screen.getAllByText(t.resultCount(0)).length;
    await userEvent.click(screen.getByRole('button', { name: t.closeRail }));
    expect(screen.queryAllByText(t.resultCount(0)).length).toBeLessThan(before);
  });

  it('applies a category filter once the filter panel is opened', async () => {
    render(<ListingMap listings={listings} />);
    expect(screen.queryByRole('button', { name: 'Araç' })).toBeNull();

    await userEvent.click(screen.getByTestId('filters-toggle'));
    await userEvent.click(screen.getByRole('button', { name: 'Araç' }));
    expect(useListingStore.getState().filters.categories).toEqual(['Araç']);
  });
});
