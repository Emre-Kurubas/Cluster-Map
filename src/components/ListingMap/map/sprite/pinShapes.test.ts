import { describe, it, expect } from 'vitest';
import { buildPinSvg, PIN_SIZE } from './pinShapes';
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
