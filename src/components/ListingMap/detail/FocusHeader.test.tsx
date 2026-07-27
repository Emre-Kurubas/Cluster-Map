import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusHeader } from './FocusHeader';
import type { Listing } from '../types/listing';

const listing: Listing = {
  id: 1,
  title: 'İlan 1',
  subTitle: 'Ankara 1. İcra Dairesi',
  description: 'Açıklama',
  price: 1_000_000,
  category: 'Arsa',
  saleType: 'İcra',
  location: { lat: 39.9334, lng: 32.8597 },
  thumbnailUrl: '',
  detailUrl: '/ilan/1',
};

describe('FocusHeader', () => {
  it('shows the listing address when it has one', () => {
    render(
      <FocusHeader listing={{ ...listing, address: 'Kızılay Mah., Çankaya, Ankara' }} />,
    );
    expect(screen.getByText('Kızılay Mah., Çankaya, Ankara')).toBeInTheDocument();
  });

  it('falls back to the province derived from the coordinates', () => {
    render(<FocusHeader listing={listing} />);
    expect(screen.getByText('Ankara')).toBeInTheDocument();
  });

  it('falls back when the address is an empty string', () => {
    render(<FocusHeader listing={{ ...listing, address: '   ' }} />);
    expect(screen.getByText('Ankara')).toBeInTheDocument();
  });
});
