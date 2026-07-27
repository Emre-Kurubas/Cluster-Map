import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultsRail } from './ResultsRail';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';
import type { Listing } from '../types/listing';

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

const listings = [make(1), make(2), make(3)];
const state = () => useListingStore.getState();

describe('ResultsRail', () => {
  beforeEach(() => state().resetAll());

  it('shows only listings that are in the viewport', () => {
    state().setVisibleIds([1, 3]);
    render(<ResultsRail listings={listings} />);
    expect(screen.getByText('İlan 1')).toBeInTheDocument();
    expect(screen.queryByText('İlan 2')).toBeNull();
    expect(screen.getByText('İlan 3')).toBeInTheDocument();
  });

  it('announces the visible count', () => {
    state().setVisibleIds([1, 3]);
    render(<ResultsRail listings={listings} />);
    expect(screen.getByText(t.resultCount(2))).toBeInTheDocument();
  });

  it('preserves the order of the listings it was given', () => {
    state().setVisibleIds([3, 1]);
    render(<ResultsRail listings={listings} />);
    const titles = screen.getAllByTestId('listing-title').map((n) => n.textContent);
    expect(titles).toEqual(['İlan 1', 'İlan 3']);
  });

  it('formats prices in tr-TR', () => {
    state().setVisibleIds([1]);
    render(<ResultsRail listings={listings} />);
    expect(screen.getByText('1.000.000 ₺')).toBeInTheDocument();
  });

  it('selects a listing when its card is clicked', async () => {
    state().setVisibleIds([1]);
    render(<ResultsRail listings={listings} />);
    await userEvent.click(screen.getByText('İlan 1'));
    expect(state().selectedId).toBe(1);
  });

  /**
   * The card being described is often outside the viewport that produced the
   * list, so choosing one asks the map to go there. Clicking a pin does not —
   * that selection came from the map and must not move it.
   */
  it('asks to focus the listing whose card was clicked', async () => {
    const onFocus = vi.fn();
    state().setVisibleIds([1, 2]);
    render(<ResultsRail listings={listings} onFocus={onFocus} />);
    await userEvent.click(screen.getByText('İlan 2'));
    expect(onFocus).toHaveBeenCalledWith(listings[1]);
  });

  it('focuses again when the same card is clicked after panning away', async () => {
    const onFocus = vi.fn();
    state().setVisibleIds([1]);
    render(<ResultsRail listings={listings} onFocus={onFocus} />);
    await userEvent.click(screen.getByText('İlan 1'));
    await userEvent.click(screen.getByText('İlan 1'));
    expect(onFocus).toHaveBeenCalledTimes(2);
  });

  it('still selects when no focus handler is given', async () => {
    state().setVisibleIds([1]);
    render(<ResultsRail listings={listings} />);
    await userEvent.click(screen.getByText('İlan 1'));
    expect(state().selectedId).toBe(1);
  });

  it('shows the empty state when nothing is visible', () => {
    state().setVisibleIds([]);
    render(<ResultsRail listings={listings} />);
    expect(screen.getByText(t.noResults)).toBeInTheDocument();
  });

  it('offers a reset action from the empty state', async () => {
    state().setVisibleIds([]);
    state().toggleCategoryVisibility('Araç');
    render(<ResultsRail listings={[]} />);
    await userEvent.click(screen.getByRole('button', { name: t.clearFilters }));
    expect(state().filters.hiddenCategories).toEqual([]);
  });

  it('marks the selected card with aria-current', async () => {
    state().setVisibleIds([1, 2]);
    render(<ResultsRail listings={listings} />);
    await userEvent.click(screen.getByText('İlan 2'));
    const cards = screen.getAllByRole('button', { name: /İlan/ });
    expect(cards[1]).toHaveAttribute('aria-current', 'true');
    expect(cards[0]).toHaveAttribute('aria-current', 'false');
  });
});
