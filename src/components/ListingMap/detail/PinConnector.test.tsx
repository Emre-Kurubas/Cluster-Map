import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PinConnector } from './PinConnector';

const circle = { cx: 100, cy: 100, r: 50 };

describe('PinConnector', () => {
  it('draws a line from the circle edge to the pin', () => {
    render(<PinConnector circle={circle} pin={{ x: 300, y: 100 }} visible />);
    const line = screen.getByTestId('pin-connector-line');
    expect(line).toHaveAttribute('x1', '150');
    expect(line).toHaveAttribute('x2', '300');
  });

  it('marks the pin end with a dot', () => {
    render(<PinConnector circle={circle} pin={{ x: 300, y: 100 }} visible />);
    const dot = screen.getByTestId('pin-connector-dot');
    expect(dot).toHaveAttribute('cx', '300');
    expect(dot).toHaveAttribute('cy', '100');
  });

  it('renders nothing without a measured circle', () => {
    render(<PinConnector circle={null} pin={{ x: 300, y: 100 }} visible />);
    expect(screen.queryByTestId('pin-connector-line')).toBeNull();
  });

  it('renders nothing without a pin', () => {
    render(<PinConnector circle={circle} pin={null} visible />);
    expect(screen.queryByTestId('pin-connector-line')).toBeNull();
  });

  it('renders nothing when the pin is inside the circle', () => {
    render(<PinConnector circle={circle} pin={{ x: 105, y: 100 }} visible />);
    expect(screen.queryByTestId('pin-connector-line')).toBeNull();
  });

  it('fades out rather than unmounting when the pin leaves the view', () => {
    render(
      <PinConnector circle={circle} pin={{ x: 300, y: 100 }} visible={false} />,
    );
    expect(screen.getByTestId('pin-connector')).toHaveClass('opacity-0');
  });
});
