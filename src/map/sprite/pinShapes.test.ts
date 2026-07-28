import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  buildPinSvg, loadPinImages, PIN_SIZE, SPRITE_LOAD_TIMEOUT_MS,
} from './pinShapes';
import { CATEGORY_LIST, getCategoryConfig } from '../../config/categories';

describe('buildPinSvg', () => {
  it('produces a well-formed svg for every category', () => {
    for (const category of CATEGORY_LIST) {
      const svg = buildPinSvg(category);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    }
  });

  it('paints each pin in its category color', () => {
    for (const category of CATEGORY_LIST) {
      expect(buildPinSvg(category)).toContain(getCategoryConfig(category).color);
    }
  });

  it('gives each category a visually distinct body path', () => {
    const bodies = CATEGORY_LIST.map((c) => {
      const match = /<path d="([^"]+)" class="body"/.exec(buildPinSvg(c));
      return match?.[1];
    });
    expect(bodies.every(Boolean)).toBe(true);
    expect(new Set(bodies).size).toBe(3);
  });

  it('declares explicit pixel dimensions so rasterization is deterministic', () => {
    const svg = buildPinSvg('Arsa');
    expect(svg).toContain(`width="${PIN_SIZE.width}"`);
    expect(svg).toContain(`height="${PIN_SIZE.height}"`);
  });
});

/**
 * Regression guard. loadPinImages runs inside the map's `load` handler, ahead
 * of addSource/addLayer. It once rejected — Chrome cannot decode an SVG through
 * createImageBitmap — which aborted that sequence and left the map with no
 * source, no layers, and a permanently empty listing count.
 *
 * jsdom provides no canvas 2D context, so rasterization genuinely fails here.
 * That makes this environment an accurate stand-in for the browser failure.
 */
describe('loadPinImages resilience', () => {
  const stubMap = (over: Partial<MapLibreMap> = {}) => ({
    hasImage: vi.fn(() => false),
    addImage: vi.fn(),
    ...over,
  } as unknown as MapLibreMap);

  /**
   * jsdom loads no images, so neither onload nor onerror ever fires — the exact
   * stall the timeout exists to bound. Fake timers drive it to that timeout
   * without spending three real seconds per assertion.
   */
  const settle = async (pending: Promise<void>) => {
    await vi.advanceTimersByTimeAsync(SPRITE_LOAD_TIMEOUT_MS + 50);
    return pending;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resolves rather than hanging when an icon never decodes', async () => {
    await expect(settle(loadPinImages(stubMap()))).resolves.toBeUndefined();
  });

  it('resolves even when addImage itself throws', async () => {
    const map = stubMap({ addImage: vi.fn(() => { throw new Error('boom'); }) });
    await expect(settle(loadPinImages(map))).resolves.toBeUndefined();
  });

  it('warns once per failed icon so the cause stays visible', async () => {
    await settle(loadPinImages(stubMap()));
    expect(console.warn).toHaveBeenCalledTimes(CATEGORY_LIST.length);
  });

  it('skips icons already registered on the map', async () => {
    const addImage = vi.fn();
    await settle(loadPinImages(stubMap({ hasImage: vi.fn(() => true), addImage })));
    expect(addImage).not.toHaveBeenCalled();
  });

  it('never calls createImageBitmap, which cannot decode SVG in Chrome', async () => {
    const createImageBitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', createImageBitmap);
    await settle(loadPinImages(stubMap()));
    expect(createImageBitmap).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
