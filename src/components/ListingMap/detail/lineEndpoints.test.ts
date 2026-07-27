import { describe, it, expect } from 'vitest';
import { lineEndpoints } from './lineEndpoints';

const circle = { cx: 100, cy: 100, r: 50 };

describe('lineEndpoints', () => {
  it('starts on the circle edge directly toward a pin to the right', () => {
    const segment = lineEndpoints(circle, { x: 300, y: 100 });
    expect(segment).toEqual({ x1: 150, y1: 100, x2: 300, y2: 100 });
  });

  it('starts on the circle edge toward a pin above', () => {
    const segment = lineEndpoints(circle, { x: 100, y: -100 });
    expect(segment).toEqual({ x1: 100, y1: 50, x2: 100, y2: -100 });
  });

  it('places the start exactly one radius from the centre in any direction', () => {
    const segment = lineEndpoints(circle, { x: 400, y: 300 });
    if (!segment) throw new Error('expected a segment');
    const dx = segment.x1 - circle.cx;
    const dy = segment.y1 - circle.cy;
    expect(Math.hypot(dx, dy)).toBeCloseTo(50, 6);
  });

  it('keeps the pin as the far endpoint', () => {
    const segment = lineEndpoints(circle, { x: 400, y: 300 });
    expect(segment?.x2).toBe(400);
    expect(segment?.y2).toBe(300);
  });

  it('returns null when the pin sits inside the circle', () => {
    expect(lineEndpoints(circle, { x: 110, y: 105 })).toBeNull();
  });

  it('returns null when the pin sits exactly on the centre', () => {
    expect(lineEndpoints(circle, { x: 100, y: 100 })).toBeNull();
  });

  it('returns null for a zero-radius circle it has not measured yet', () => {
    expect(lineEndpoints({ cx: 0, cy: 0, r: 0 }, { x: 10, y: 10 })).toBeNull();
  });
});
