import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CirclePhoto } from './CirclePhoto';
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

const COLOR = '#3d9a82';

describe('CirclePhoto', () => {
  it('is a button labelled for enlarging the photo', () => {
    render(<CirclePhoto listing={listing} onOpen={() => {}} color={COLOR} />);
    expect(screen.getByRole('button', { name: t.openPhoto })).toBeInTheDocument();
  });

  it('calls onOpen when clicked', async () => {
    const onOpen = vi.fn();
    render(<CirclePhoto listing={listing} onOpen={onOpen} color={COLOR} />);
    await userEvent.click(screen.getByRole('button', { name: t.openPhoto }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('stays a button when the photo falls back to category art', async () => {
    const onOpen = vi.fn();
    render(
      <CirclePhoto listing={{ ...listing, thumbnailUrl: '' }} onOpen={onOpen} color={COLOR} />,
    );
    expect(screen.getByTestId('circle-fallback')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.openPhoto }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('exposes its element through innerRef for measurement', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<CirclePhoto listing={listing} onOpen={() => {}} innerRef={ref} color={COLOR} />);
    expect(ref.current).toBe(screen.getByTestId('circle-photo'));
  });
});
