import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { CategoryDock } from './CategoryDock';
import { createListingStore } from '../store/createListingStore';
import type { ListingStore } from '../store/createListingStore';
import { renderWithStore } from '../test/renderWithStore';
import { t } from '../i18n/tr';

// A fresh store per test, so nothing needs resetting and no test can leak into
// the next by forgetting to.
let store: ListingStore;
const state = () => store.getState();
const render = (ui: ReactElement) => renderWithStore(ui, { store });

describe('CategoryDock', () => {
  beforeEach(() => { store = createListingStore(); });

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

  it('starts with every category on, matching what the map is showing', () => {
    render(<CategoryDock />);
    for (const name of ['Gayrimenkul', 'Arsa', 'Araç']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
    }
  });

  it('crosses a category out of the map when clicked', async () => {
    render(<CategoryDock />);
    await userEvent.click(screen.getByRole('button', { name: 'Arsa' }));
    expect(state().filters.hiddenCategories).toEqual(['Arsa']);
  });

  it('leaves the other categories alone', async () => {
    render(<CategoryDock />);
    await userEvent.click(screen.getByRole('button', { name: 'Arsa' }));
    expect(screen.getByRole('button', { name: 'Araç' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('brings a crossed-out category back on a second click', async () => {
    render(<CategoryDock />);
    const arsa = screen.getByRole('button', { name: 'Arsa' });
    await userEvent.click(arsa);
    await userEvent.click(arsa);
    expect(state().filters.hiddenCategories).toEqual([]);
  });

  it('reports the visible state through aria-pressed', async () => {
    render(<CategoryDock />);
    const arsa = screen.getByRole('button', { name: 'Arsa' });
    expect(arsa).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(arsa);
    expect(arsa).toHaveAttribute('aria-pressed', 'false');
  });

  it('strikes the label through once the category is off', async () => {
    render(<CategoryDock />);
    const arsa = screen.getByRole('button', { name: 'Arsa' });
    expect(screen.getByText('Arsa')).not.toHaveClass('line-through');
    await userEvent.click(arsa);
    expect(screen.getByText('Arsa')).toHaveClass('line-through');
  });
});
