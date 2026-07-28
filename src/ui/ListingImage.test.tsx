import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListingImage } from './ListingImage';
import { ImageBaseUrlProvider } from '../lib/imageBaseUrl';
import type { Listing } from '../types/listing';

const listing: Listing = {
  id: 81200004,
  title: "Adıyaman Merkez'de Satılık Dubleks Mesken",
  subTitle: 'Adıyaman 2. İcra Dairesi',
  description: 'Açıklama',
  price: 606000,
  category: 'Gayrimenkul',
  saleType: 'İcra',
  location: { lat: 37.77194, lng: 38.30335 },
  thumbnailUrl: 'https://cdn.example.com/listings/81200004.jpg',
  detailUrl: '/ilan/adiyaman-81200004',
};

describe('ListingImage', () => {
  it('requests the listing url when no base is configured', () => {
    render(<ListingImage listing={listing} testId="img" fallbackTestId="fb" />);
    expect(screen.getByTestId('img')).toHaveAttribute('src', listing.thumbnailUrl);
  });

  it('requests the configured host when one is provided', () => {
    render(
      <ImageBaseUrlProvider value="https://cdn.example.com/listings">
        <ListingImage listing={listing} testId="img" fallbackTestId="fb" />
      </ImageBaseUrlProvider>,
    );
    expect(screen.getByTestId('img'))
      .toHaveAttribute('src', 'https://cdn.example.com/listings/81200004.jpg');
  });

  it('falls back to category art when the image fails', () => {
    render(<ListingImage listing={listing} testId="img" fallbackTestId="fb" />);
    fireEvent.error(screen.getByTestId('img'));
    expect(screen.getByTestId('fb')).toBeInTheDocument();
    expect(screen.queryByTestId('img')).toBeNull();
  });

  it('shows the fallback immediately when there is nothing to request', () => {
    render(
      <ListingImage
        listing={{ ...listing, thumbnailUrl: '' }}
        testId="img"
        fallbackTestId="fb"
      />,
    );
    expect(screen.getByTestId('fb')).toBeInTheDocument();
    expect(screen.queryByTestId('img')).toBeNull();
  });

  it('retries when the configured host changes', () => {
    const { rerender } = render(
      <ListingImage listing={listing} testId="img" fallbackTestId="fb" />,
    );
    fireEvent.error(screen.getByTestId('img'));
    expect(screen.getByTestId('fb')).toBeInTheDocument();

    rerender(
      <ImageBaseUrlProvider value="https://cdn.example.com/listings">
        <ListingImage listing={listing} testId="img" fallbackTestId="fb" />
      </ImageBaseUrlProvider>,
    );
    expect(screen.getByTestId('img'))
      .toHaveAttribute('src', 'https://cdn.example.com/listings/81200004.jpg');
  });
});
