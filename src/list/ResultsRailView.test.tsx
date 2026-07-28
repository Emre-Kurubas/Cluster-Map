import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsRailView } from './ResultsRailView';
import type { Listing } from '../types/listing';

const make = (id: number): Listing => ({
  id,
  title: `İlan ${id}`,
  subTitle: 'Ankara 1. İcra Dairesi',
  description: 'Açıklama',
  price: id * 1_000_000,
  category: 'Arsa',
  saleType: 'İcra',
  location: { lat: 39.9, lng: 32.8 },
  thumbnailUrl: '',
  detailUrl: `/ilan/${id}`,
});

describe('ResultsRailView', () => {
  /**
   * The pure half has to render with no provider anywhere — that is what makes
   * it worth exporting. It also still does the viewport intersection, which is
   * presentation: the rail shows what the map is showing.
   */
  it('renders the visible subset and reports a selection, with no store', async () => {
    const onSelect = vi.fn();
    render(
      <ResultsRailView
        listings={[make(1), make(2)]}
        visibleIds={[1]}
        selectedId={null}
        onSelect={onSelect}
        onHover={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByText('İlan 1')).toBeInTheDocument();
    expect(screen.queryByText('İlan 2')).toBeNull();

    await userEvent.click(screen.getByText('İlan 1'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
