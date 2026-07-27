import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryDock } from './CategoryDock';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

const state = () => useListingStore.getState();

describe('CategoryDock', () => {
  beforeEach(() => state().resetAll());

  it('is a labelled region so it reads as the map legend', () => {
    render(<CategoryDock />);
    expect(screen.getByRole('region', { name: t.categories })).toBeInTheDocument();
  });

  it('renders one toggle per category, with no disclosure to open first', () => {
    render(<CategoryDock />);
    expect(screen.getByRole('button', { name: 'Gayrimenkul' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arsa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Araç' })).toBeInTheDocument();
  });

  it('toggles a category into the store', async () => {
    render(<CategoryDock />);
    await userEvent.click(screen.getByRole('button', { name: 'Arsa' }));
    expect(state().filters.categories).toEqual(['Arsa']);
  });

  it('toggles a category back off', async () => {
    render(<CategoryDock />);
    const arsa = screen.getByRole('button', { name: 'Arsa' });
    await userEvent.click(arsa);
    await userEvent.click(arsa);
    expect(state().filters.categories).toEqual([]);
  });

  it('reflects active state with aria-pressed', async () => {
    render(<CategoryDock />);
    const arsa = screen.getByRole('button', { name: 'Arsa' });
    expect(arsa).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(arsa);
    expect(arsa).toHaveAttribute('aria-pressed', 'true');
  });
});
