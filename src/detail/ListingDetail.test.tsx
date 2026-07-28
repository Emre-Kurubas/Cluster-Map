import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { ListingDetail } from './ListingDetail';
import { createListingStore } from '../store/createListingStore';
import type { ListingStore } from '../store/createListingStore';
import { renderWithStore } from '../test/renderWithStore';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';

const listing: Listing = {
  id: 81200004,
  title: "Adıyaman Merkez'de Satılık Dubleks Mesken",
  subTitle: 'Adıyaman 2. İcra Dairesi - 2024/7924 Esas',
  description: 'Adıyaman ilinde bulunan Dubleks Mesken açık artırma usulüyle satılacaktır.',
  price: 606000,
  category: 'Gayrimenkul',
  saleType: 'İcra',
  location: { lat: 37.77194, lng: 38.30335 },
  thumbnailUrl: 'https://cdn.example.com/listings/81200004.jpg',
  detailUrl: '/ilan/adiyaman-81200004',
};

// A fresh store per test, so nothing needs resetting and no test can leak into
// the next by forgetting to.
let store: ListingStore = createListingStore();
const render = (ui: ReactElement) => renderWithStore(ui, { store });

describe('ListingDetail', () => {
  beforeEach(() => { store = createListingStore(); });

  it('renders the listing title, subtitle and description', () => {
    render(<ListingDetail listing={listing} onOpen={vi.fn()} />);
    expect(screen.getByText(listing.title)).toBeInTheDocument();
    expect(screen.getByText(listing.subTitle)).toBeInTheDocument();
    expect(screen.getByText(listing.description)).toBeInTheDocument();
  });

  it('formats the price in tr-TR', () => {
    render(<ListingDetail listing={listing} onOpen={vi.fn()} />);
    expect(screen.getByText('606.000 ₺')).toBeInTheDocument();
  });

  it('shows the category and sale type as badges', () => {
    render(<ListingDetail listing={listing} onOpen={vi.fn()} />);
    expect(screen.getByText('Gayrimenkul')).toBeInTheDocument();
    expect(screen.getByText('İcra')).toBeInTheDocument();
  });

  it('swaps a broken thumbnail for the category fallback', () => {
    render(<ListingDetail listing={listing} onOpen={vi.fn()} />);
    // alt="" makes this decorative, so it has role "presentation", not "img".
    const image = screen.getByTestId('detail-image');
    fireEvent.error(image);
    expect(screen.getByTestId('image-fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-image')).toBeNull();
  });

  it('calls onOpen with the listing when the CTA is clicked', async () => {
    const onOpen = vi.fn();
    render(<ListingDetail listing={listing} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: t.goToListing }));
    expect(onOpen).toHaveBeenCalledWith(listing);
  });

  it('clears the selection when closed', async () => {
    store.getState().select(listing.id);
    render(<ListingDetail listing={listing} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: t.closeDetail }));
    expect(store.getState().selectedId).toBeNull();
  });
});
