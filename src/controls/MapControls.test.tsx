import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { MapControls } from './MapControls';
import { RailToggle } from './RailToggle';
import { ErrorNotice } from './ErrorNotice';
import { createListingStore } from '../store/createListingStore';
import type { ListingStore } from '../store/createListingStore';
import { renderWithStore } from '../test/renderWithStore';
import { t } from '../i18n/tr';
import type { MapEngine } from '../types/map';

const stubEngine = (): MapEngine => ({
  setData: vi.fn(),
  flyToBounds: vi.fn(),
  flyToPoint: vi.fn(),
  project: vi.fn((): [number, number] => [0, 0]),
  queryVisibleIds: vi.fn(() => []),
  setHovered: vi.fn(),
  setSelected: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  resetView: vi.fn(),
  onIdle: vi.fn(() => () => {}),
  onMove: vi.fn(() => () => {}),
  onFeatureClick: vi.fn(() => () => {}),
  onFeatureHover: vi.fn(() => () => {}),
  onClusterClick: vi.fn(() => () => {}),
  destroy: vi.fn(),
});

// A fresh store per test, so nothing needs resetting and no test can leak into
// the next by forgetting to. MapControls and ErrorNotice never read it, but
// they still render inside the provider the package always supplies.
let store: ListingStore = createListingStore();
const render = (ui: ReactElement) => renderWithStore(ui, { store });

describe('MapControls', () => {
  beforeEach(() => { store = createListingStore(); });

  it('drives zoom in, zoom out and reset on the engine', async () => {
    const engine = stubEngine();
    render(<MapControls engine={engine} />);
    await userEvent.click(screen.getByRole('button', { name: t.zoomIn }));
    await userEvent.click(screen.getByRole('button', { name: t.zoomOut }));
    await userEvent.click(screen.getByRole('button', { name: t.resetView }));
    expect(engine.zoomIn).toHaveBeenCalledOnce();
    expect(engine.zoomOut).toHaveBeenCalledOnce();
    expect(engine.resetView).toHaveBeenCalledOnce();
  });

  it('renders nothing harmful when the engine is null', () => {
    render(<MapControls engine={null} />);
    expect(screen.getByRole('button', { name: t.zoomIn })).toBeDisabled();
  });
});

describe('RailToggle', () => {
  beforeEach(() => { store = createListingStore(); });

  it('closes the rail and flips its label', async () => {
    render(<RailToggle />);
    await userEvent.click(screen.getByRole('button', { name: t.closeRail }));
    expect(store.getState().railOpen).toBe(false);
    expect(screen.getByRole('button', { name: t.openRail })).toBeInTheDocument();
  });
});

describe('ErrorNotice', () => {
  it('shows the tile failure message', () => {
    render(<ErrorNotice kind="tile" onDismiss={vi.fn()} />);
    expect(screen.getByText(t.tileError)).toBeInTheDocument();
  });

  it('shows the webgl failure message', () => {
    render(<ErrorNotice kind="webgl" onDismiss={vi.fn()} />);
    expect(screen.getByText(t.webglError)).toBeInTheDocument();
  });

  it('calls onDismiss', async () => {
    const onDismiss = vi.fn();
    render(<ErrorNotice kind="tile" onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: t.dismiss }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
