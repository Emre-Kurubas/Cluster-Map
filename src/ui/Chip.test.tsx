import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders its label', () => {
    render(<Chip label="Ankara" />);
    expect(screen.getByText('Ankara')).toBeInTheDocument();
  });

  it('shows a remove button only when onRemove is supplied', () => {
    const { rerender } = render(<Chip label="Ankara" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<Chip label="Ankara" onRemove={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn();
    render(<Chip label="Ankara" onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('marks the active state with aria-pressed when it is a toggle', async () => {
    const onClick = vi.fn();
    render(<Chip label="Arsa" active onClick={onClick} />);
    const chip = screen.getByRole('button', { name: 'Arsa' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
