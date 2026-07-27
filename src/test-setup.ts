import '@testing-library/jest-dom/vitest';

/**
 * jsdom has no layout engine: every element measures 0×0. @tanstack/react-virtual
 * would therefore decide nothing is on screen and render zero rows, making every
 * results-rail assertion vacuously pass.
 *
 * Reporting a plausible viewport here keeps the virtualizer's real logic under
 * test instead of pushing test-only options into the component.
 */
const RECT = { width: 320, height: 600, top: 0, left: 0, right: 320, bottom: 600, x: 0, y: 0 };

Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => ({ ...RECT, toJSON: () => RECT }),
});

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get: () => RECT.height,
});

Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get: () => RECT.width,
});

/**
 * jsdom ships no ResizeObserver. ListingMap uses one to size the focus view's
 * connector overlay, so without a stub every test that renders it throws.
 * Observing is a no-op: nothing here ever resizes.
 */
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
