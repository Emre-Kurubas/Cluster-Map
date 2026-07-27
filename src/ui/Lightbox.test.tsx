import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Lightbox } from './Lightbox';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';

const listing: Listing = {
  id: 1,
  title: 'İlan 1',
  subTitle: 'Ankara 1. İcra Dairesi',
  description: 'Açıklama',
  price: 1_000_000,
  category: 'Arsa',
  saleType: 'İcra',
  location: { lat: 39.9, lng: 32.8 },
  thumbnailUrl: 'https://example.test/1.jpg',
  detailUrl: '/ilan/1',
};

describe('Lightbox', () => {
  it('renders as a dialog holding the photo', () => {
    render(<Lightbox listing={listing} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: t.listingPhoto })).toBeInTheDocument();
    expect(screen.getByTestId('lightbox-image')).toBeInTheDocument();
  });

  it('closes from the close button', async () => {
    const onClose = vi.fn();
    render(<Lightbox listing={listing} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: t.closePhoto }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<Lightbox listing={listing} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('lightbox-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the photo itself is clicked', async () => {
    const onClose = vi.fn();
    render(<Lightbox listing={listing} onClose={onClose} />);
    await userEvent.click(screen.getByTestId('lightbox-image'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('still shows a figure when the photo falls back to category art', () => {
    render(
      <Lightbox listing={{ ...listing, thumbnailUrl: '' }} onClose={() => {}} />,
    );
    expect(screen.getByTestId('lightbox-fallback')).toBeInTheDocument();
  });
});
