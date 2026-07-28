import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { FocusView } from './FocusView';
import { createListingStore } from '../store/createListingStore';
import type { ListingStore } from '../store/createListingStore';
import { renderWithStore } from '../test/renderWithStore';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';
import type { MapEngine } from '../types/map';

const listing: Listing = {
  id: 1,
  title: 'İlan 1',
  subTitle: 'Ankara 1. İcra Dairesi',
  description: 'Açıklama metni',
  price: 1_000_000,
  category: 'Arsa',
  saleType: 'İcra',
  location: { lat: 39.9334, lng: 32.8597 },
  thumbnailUrl: 'https://example.test/1.jpg',
  detailUrl: '/ilan/1',
};

const SIZE = { width: 800, height: 600 };

function fakeEngine() {
  return {
    project: () => [400, 300] as [number, number],
    onMove: () => () => {},
    resetView: vi.fn(),
  } as unknown as MapEngine;
}

let engine: MapEngine = fakeEngine();

// A fresh store per test, so nothing needs resetting and no test can leak into
// the next by forgetting to.
let store: ListingStore = createListingStore();
const render = (ui: ReactElement) => renderWithStore(ui, { store });

const setup = (onOpen = vi.fn()) => {
  render(
    <FocusView listing={listing} engine={engine} size={SIZE} onOpen={onOpen} />,
  );
  return onOpen;
};

describe('FocusView', () => {
  beforeEach(() => {
    engine = fakeEngine();
    store = createListingStore();
    store.getState().select(1);

    // jsdom reports every rect as zero, which would leave the circle radius at
    // 0 and suppress the connector. 200x200 at the origin gives the geometry
    // something real to work with.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 200,
      width: 200, height: 200, toJSON: () => ({}),
    } as DOMRect);
  });

  it('shows the address header, the photo and the listing details', () => {
    setup();
    expect(screen.getByText('Ankara')).toBeInTheDocument();
    expect(screen.getByTestId('circle-photo')).toBeInTheDocument();
    expect(screen.getByText('İlan 1')).toBeInTheDocument();
    expect(screen.getByText('Açıklama metni')).toBeInTheDocument();
  });

  it('clears the selection from the back button', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: t.backToList }));
    expect(store.getState().selectedId).toBeNull();
  });

  it('returns the map to the default view from the back button', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: t.backToList }));
    expect(engine.resetView).toHaveBeenCalledTimes(1);
  });

  it('returns the map to the default view when escape leaves focus mode', async () => {
    setup();
    await userEvent.keyboard('{Escape}');
    expect(engine.resetView).toHaveBeenCalledTimes(1);
  });

  it('does not reset the map when escape only closes the lightbox', async () => {
    setup();
    await userEvent.click(screen.getByTestId('circle-photo'));
    await userEvent.keyboard('{Escape}');
    expect(engine.resetView).not.toHaveBeenCalled();
  });

  it('lists the listing fields with their labels', () => {
    setup();
    const list = screen.getByTestId('focus-fields');
    for (const label of [
      t.fieldCategory,
      t.fieldSaleType,
      t.fieldOffice,
      t.fieldPrice,
      t.fieldDescription,
    ]) {
      expect(within(list).getByText(label)).toBeInTheDocument();
    }
    expect(within(list).getByText('Arsa')).toBeInTheDocument();
    expect(within(list).getByText('Açıklama metni')).toBeInTheDocument();
  });

  it('opens the lightbox from the photo', async () => {
    setup();
    await userEvent.click(screen.getByTestId('circle-photo'));
    expect(screen.getByRole('dialog', { name: t.listingPhoto })).toBeInTheDocument();
  });

  it('opens the lightbox even when the photo fell back to category art', async () => {
    render(
      <FocusView
        listing={{ ...listing, thumbnailUrl: '' }}
        engine={engine}
        size={SIZE}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByTestId('circle-fallback')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('circle-photo'));
    expect(screen.getByRole('dialog', { name: t.listingPhoto })).toBeInTheDocument();
  });

  it('escape closes the lightbox first and leaves the selection alone', async () => {
    setup();
    await userEvent.click(screen.getByTestId('circle-photo'));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: t.listingPhoto })).toBeNull();
    expect(store.getState().selectedId).toBe(1);
  });

  it('escape leaves focus mode once the lightbox is closed', async () => {
    setup();
    await userEvent.keyboard('{Escape}');
    expect(store.getState().selectedId).toBeNull();
  });

  it('calls onOpen from the CTA', async () => {
    const onOpen = setup();
    await userEvent.click(screen.getByRole('button', { name: t.goToListing }));
    expect(onOpen).toHaveBeenCalledWith(listing);
  });

  it('renders the connector once the pin has been projected', () => {
    setup();
    expect(screen.getByTestId('pin-connector')).toBeInTheDocument();
  });
});
