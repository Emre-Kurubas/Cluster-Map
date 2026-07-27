import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from './FilterBar';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

const state = () => useListingStore.getState();

describe('FilterBar', () => {
  beforeEach(() => state().resetAll());

  it('renders one toggle per category', () => {
    render(<FilterBar />);
    expect(screen.getByRole('button', { name: 'Gayrimenkul' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arsa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Araç' })).toBeInTheDocument();
  });

  it('toggles a category into the store', async () => {
    render(<FilterBar />);
    await userEvent.click(screen.getByRole('button', { name: 'Arsa' }));
    expect(state().filters.categories).toEqual(['Arsa']);
  });

  it('reflects active state with aria-pressed', async () => {
    render(<FilterBar />);
    const arsa = screen.getByRole('button', { name: 'Arsa' });
    expect(arsa).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(arsa);
    expect(arsa).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies a price preset', async () => {
    render(<FilterBar />);
    await userEvent.click(screen.getByRole('button', { name: '1 mn ₺ altı' }));
    expect(state().filters.priceMax).toBe(1_000_000);
    expect(state().filters.priceMin).toBeNull();
  });

  it('applies typed price bounds', async () => {
    render(<FilterBar />);
    await userEvent.type(screen.getByLabelText('En az'), '500000');
    await userEvent.type(screen.getByLabelText('En çok'), '3000000');
    expect(state().filters.priceMin).toBe(500_000);
    expect(state().filters.priceMax).toBe(3_000_000);
  });

  it('treats an emptied price field as no bound rather than zero', async () => {
    render(<FilterBar />);
    const min = screen.getByLabelText('En az');
    await userEvent.type(min, '500000');
    await userEvent.clear(min);
    expect(state().filters.priceMin).toBeNull();
  });

  it('changes the sort mode', async () => {
    render(<FilterBar />);
    await userEvent.selectOptions(screen.getByLabelText(t.sort), 'price-desc');
    expect(state().sort).toBe('price-desc');
  });

  it('resets everything with the reset button', async () => {
    render(<FilterBar />);
    await userEvent.click(screen.getByRole('button', { name: 'Arsa' }));
    await userEvent.click(screen.getByRole('button', { name: t.clearFilters }));
    expect(state().filters.categories).toEqual([]);
  });

  it('hides the reset button when nothing is filtered', () => {
    render(<FilterBar />);
    expect(screen.queryByRole('button', { name: t.clearFilters })).toBeNull();
  });
});
