import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassPanel } from './GlassPanel';

describe('GlassPanel', () => {
  it('renders its children', () => {
    render(<GlassPanel>içerik</GlassPanel>);
    expect(screen.getByText('içerik')).toBeInTheDocument();
  });

  it('applies the blur and translucency classes', () => {
    const { container } = render(<GlassPanel>x</GlassPanel>);
    const panel = container.firstElementChild!;
    expect(panel.className).toContain('backdrop-blur-xl');
    expect(panel.className).toContain('bg-white/65');
  });

  it('merges a caller-supplied className instead of dropping it', () => {
    const { container } = render(<GlassPanel className="w-80">x</GlassPanel>);
    expect(container.firstElementChild!.className).toContain('w-80');
    expect(container.firstElementChild!.className).toContain('backdrop-blur-xl');
  });

  it('forwards arbitrary props such as role', () => {
    render(<GlassPanel role="region" aria-label="panel">x</GlassPanel>);
    expect(screen.getByRole('region', { name: 'panel' })).toBeInTheDocument();
  });
});
