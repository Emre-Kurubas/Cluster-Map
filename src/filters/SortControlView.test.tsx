import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortControlView } from './SortControlView';
import { t } from '../i18n/tr';

describe('SortControlView', () => {
  /**
   * The pure half has to render with no provider anywhere. That is the whole
   * reason it exists: a consumer can drop it into their own layout and wire it
   * to their own state.
   */
  it('renders and reports a choice without any store', async () => {
    const onChange = vi.fn();
    render(<SortControlView sort="relevance" onChange={onChange} />);

    expect(screen.getByRole('radio', { name: t.sortRelevance }))
      .toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('radio', { name: t.sortPriceDesc }));
    expect(onChange).toHaveBeenCalledWith('price-desc');
  });
});
