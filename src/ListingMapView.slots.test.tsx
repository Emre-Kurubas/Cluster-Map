import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ListingMapView } from './ListingMapView';
import { createListingStore } from './store/createListingStore';
import type { ListingStore } from './store/createListingStore';
import type { ListingMapSlots } from './slots';
import { renderWithStore } from './test/renderWithStore';
import { t } from './i18n/tr';
import type { Listing } from './types/listing';

// jsdom has no WebGL, and none of this depends on what the canvas draws.
vi.mock('./map/MapCanvas', () => ({
  MapCanvas: () => <div data-testid="map-canvas" />,
}));

const make = (id: number): Listing => ({
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
});

const listings = [make(1), make(2)];

let store: ListingStore = createListingStore();

describe('slots', () => {
  beforeEach(() => { store = createListingStore(); });

  const render = (slots?: ListingMapSlots) =>
    renderWithStore(<ListingMapView listings={listings} slots={slots} />, { store });

  it('renders every default when no slots are given', () => {
    render();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: t.filters })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: t.categories })).toBeInTheDocument();
  });

  it('removes a slot switched off', () => {
    render({ searchBar: false });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    // The neighbour in the same header row is untouched.
    expect(screen.getByRole('region', { name: t.filters })).toBeInTheDocument();
  });

  it('renders a replacement in the default position', () => {
    render({ searchBar: () => <input aria-label="Kendi arama" /> });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Kendi arama')).toBeInTheDocument();
  });

  /**
   * The layout hands a replacement exactly what it hands the default, so a
   * custom rail gets the filtered listings without touching the store.
   */
  it('hands a replacement the props the default would have received', () => {
    const seen: number[] = [];
    render({
      rail: ({ listings: given }) => {
        seen.push(given.length);
        return <div data-testid="custom-rail" />;
      },
    });
    expect(screen.getAllByTestId('custom-rail').length).toBeGreaterThan(0);
    expect(seen[0]).toBe(2);
  });

  /**
   * A handle that opens and closes a rail which is not there is a bug, not a
   * choice the API should let someone express.
   */
  it('drops the rail toggle along with the rail', () => {
    render({ rail: false });
    // The handle is labelled by state — one string open, another shut — so both.
    expect(screen.queryByRole('button', { name: t.openRail })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.closeRail })).not.toBeInTheDocument();
  });

  it('leaves the map canvas alone — it is not a slot', () => {
    render({
      searchBar: false, filterBar: false, rail: false,
      categoryDock: false, mapControls: false,
    });
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
  });
});
