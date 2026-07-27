import { describe, it, expect, vi } from 'vitest';

/**
 * jsdom has no canvas and no image decoder, so the real rasterizer can only
 * time out. What is under test here is the resolver's routing — which ids it
 * claims, which it leaves alone — not the pixels.
 */
vi.mock('./pinShapes', () => ({
  rasterizeSvg: vi.fn(async (svg: string) => ({ svg }) as unknown as ImageData),
}));
import {
  DONUT_STEPS, DONUT_SIZE, HEAD_CENTER, HEAD_RADIUS, TIP_OFFSET, HALO_BLEED,
  buildDonutSvg, donutSpriteId, donutSpriteIds, registerDonutSpriteResolver,
} from './donutShapes';
import { getCategoryConfig } from '../../config/categories';

const GAYRIMENKUL = getCategoryConfig('Gayrimenkul').color;
const ARSA = getCategoryConfig('Arsa').color;
const ARAC = getCategoryConfig('Araç').color;

describe('donutSpriteIds', () => {
  const ids = donutSpriteIds();

  it('covers every mix of tenths that can be reached', () => {
    // Compositions of DONUT_STEPS into three parts: (10+1)(10+2)/2 = 66.
    expect(ids).toHaveLength(((DONUT_STEPS + 1) * (DONUT_STEPS + 2)) / 2);
  });

  it('has no duplicates', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never lets the first two shares exceed the whole', () => {
    for (const id of ids) {
      const [, a, b] = id.split('-').map(Number);
      expect(a + b).toBeLessThanOrEqual(DONUT_STEPS);
    }
  });

  it('uses ascii ids, which is what addImage requires', () => {
    for (const id of ids) expect(id).toMatch(/^donut-\d+-\d+$/);
  });
});

describe('donutSpriteId', () => {
  it('names a sprite from the two leading shares', () => {
    expect(donutSpriteId(3, 5)).toBe('donut-3-5');
  });

  it('produces ids that exist in the generated set', () => {
    expect(donutSpriteIds()).toContain(donutSpriteId(0, 10));
    expect(donutSpriteIds()).toContain(donutSpriteId(10, 0));
  });
});

describe('buildDonutSvg', () => {
  it('draws one arc per category present', () => {
    const svg = buildDonutSvg(4, 3);
    expect(svg).toContain(GAYRIMENKUL);
    expect(svg).toContain(ARSA);
    expect(svg).toContain(ARAC);
  });

  it('omits a category with no listings rather than drawing a zero arc', () => {
    const svg = buildDonutSvg(10, 0);
    expect(svg).toContain(GAYRIMENKUL);
    expect(svg).not.toContain(ARSA);
    expect(svg).not.toContain(ARAC);
  });

  it('gives the remainder to the third category', () => {
    const svg = buildDonutSvg(0, 0);
    expect(svg).toContain(ARAC);
    expect(svg).not.toContain(GAYRIMENKUL);
  });

  it('emits an svg with an explicit viewBox so it rasterizes crisply', () => {
    const svg = buildDonutSvg(5, 5);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${DONUT_SIZE.width} ${DONUT_SIZE.height}"`);
  });

  describe('the teardrop body', () => {
    const svg = buildDonutSvg(5, 5);

    it('is drawn behind the ring, so the count reads on white', () => {
      expect(svg.indexOf('class="body"')).toBeLessThan(svg.indexOf('class="ring"'));
    });

    // A pin whose head is a full circle joined by two curves that leave it
    // where its tangent is already vertical. An arc plus two cubics is the
    // whole shape; a `L` anywhere in it would be a kink.
    it('joins the head to the tip with curves, not straight lines', () => {
      const path = svg.match(/class="body" d="([^"]+)"/)?.[1] ?? '';
      expect(path).toMatch(/^M .*A .*C .*C .*Z$/);
      expect(path).not.toContain('L');
    });

    it('reaches the tip near the foot of the sprite box', () => {
      // Room for the halo and no more: wasted transparent rows would shift
      // where a tip-anchored icon sits.
      const tipY = HEAD_CENTER.y + TIP_OFFSET;
      expect(DONUT_SIZE.height - tipY).toBeGreaterThanOrEqual(HALO_BLEED);
      expect(DONUT_SIZE.height - tipY).toBeLessThanOrEqual(HALO_BLEED + 3);
    });

    // The halo strokes bleed outward from the outline. Clipping them at the
    // sprite edge cuts a flat grey line across the pin's shadow.
    it('leaves room for the halo on every side', () => {
      expect(HEAD_CENTER.x - HEAD_RADIUS).toBeGreaterThanOrEqual(HALO_BLEED);
      expect(DONUT_SIZE.width - (HEAD_CENTER.x + HEAD_RADIUS))
        .toBeGreaterThanOrEqual(HALO_BLEED);
      expect(HEAD_CENTER.y - HEAD_RADIUS).toBeGreaterThanOrEqual(HALO_BLEED);
    });

    /**
     * The halo is a falloff faked with concentric strokes, so it only reads as
     * a shadow if it has enough steps and each one is faint. Three heavy
     * strokes banded into visible rings and looked like a cut-out sticker.
     */
    describe('the halo', () => {
      // `fill="none"` is what separates the halo strokes from the white body,
      // which carries its own — firmer — edge in the same ink.
      const strokes = [
        ...svg.matchAll(/fill="none" stroke="rgba\(34,49,63,([\d.]+)\)" stroke-width="([\d.]+)"/g),
      ].map(([, alpha, width]) => ({ alpha: Number(alpha), width: Number(width) }));

      it('has enough steps to ramp rather than band', () => {
        expect(strokes.length).toBeGreaterThanOrEqual(6);
      });

      it('narrows monotonically, so later strokes stack towards the outline', () => {
        const widths = strokes.map((stroke) => stroke.width);
        expect(widths).toEqual([...widths].sort((a, b) => b - a));
      });

      it('reaches exactly the bleed the sprite box makes room for', () => {
        expect(Math.max(...strokes.map((stroke) => stroke.width)) / 2).toBe(HALO_BLEED);
      });

      /**
       * The coloured band is drawn over the halo, on the same outline. If the
       * narrowest halo stroke were wider than the band, nothing of the shadow
       * would survive and the pin would sit flat on the map again.
       */
      it('stays clear of the band that is painted over it', () => {
        const band = Number(svg.match(/pathLength="\d+"[^>]*stroke-width="([\d.]+)"/)?.[1]);
        expect(band).toBeGreaterThan(0);
        expect(Math.min(...strokes.map((stroke) => stroke.width)))
          .toBeGreaterThanOrEqual(band);
      });

      it('keeps every step faint enough that none of them is a visible ring', () => {
        for (const { alpha } of strokes) expect(alpha).toBeLessThan(0.06);
      });
    });

    /**
     * The point of the shape change: the mix is banded along the pin's own
     * contour, so it runs down the flanks and through the tip. A ring inside
     * the head left the silhouette itself uncoloured.
     */
    it('paints every segment onto the body outline, not onto a circle', () => {
      const bodyPath = svg.match(/class="body" d="([^"]+)"/)?.[1] ?? '';
      const segmentPaths = [...svg.matchAll(/<path d="([^"]+)" pathLength=/g)]
        .map((match) => match[1]);

      expect(segmentPaths.length).toBeGreaterThan(0);
      for (const path of segmentPaths) expect(path).toBe(bodyPath);
      expect(svg).not.toContain('<circle');
    });

    it('measures the shares against a declared pathLength, not real geometry', () => {
      // An arc plus two cubics has no closed-form length worth hand-rolling,
      // and getTotalLength needs a DOM these sprites are built without.
      const declared = [...svg.matchAll(/pathLength="(\d+)"/g)].map((m) => Number(m[1]));
      expect(new Set(declared).size).toBe(1);

      const dashes = [...svg.matchAll(/stroke-dasharray="([\d.]+) ([\d.]+)"/g)];
      for (const [, on, off] of dashes) {
        expect(Number(on) + Number(off)).toBeCloseTo(declared[0], 6);
      }
    });

    it('lays the shares end to end around the whole outline', () => {
      const covered = [...svg.matchAll(/stroke-dasharray="([\d.]+) /g)]
        .reduce((total, match) => total + Number(match[1]), 0);
      const declared = Number(svg.match(/pathLength="(\d+)"/)?.[1]);
      expect(covered).toBeCloseTo(declared, 6);
    });

    // The tip is a ~56° corner; a miter join there runs past the point by
    // twice the stroke width and gets clipped into a flat grey stub.
    it('rounds every join, so nothing spikes out of the tip', () => {
      const strokedPaths = [...svg.matchAll(/<path [^>]*stroke-width="[^"]+"[^>]*>/g)]
        .map((match) => match[0]);
      expect(strokedPaths.length).toBeGreaterThan(0);
      for (const path of strokedPaths) expect(path).toContain('stroke-linejoin="round"');
    });
  });

  it('renders every id in the sprite set without throwing', () => {
    for (const id of donutSpriteIds()) {
      const [, a, b] = id.split('-').map(Number);
      expect(buildDonutSvg(a, b)).toContain('<svg');
    }
  });
});

/**
 * The 66 donut sprites used to be rasterized before the source and layers were
 * registered, so no pin drew until every mix a cluster could theoretically have
 * had been decoded — including the great majority that never occur in a given
 * dataset.
 *
 * MapLibre awaits `setMissingStyleImageResolver`, so an icon asked for and
 * generated on the spot still lands in the first paint. That is why this uses
 * the resolver rather than the `styleimagemissing` event, which only fires
 * after the resolver has already failed.
 */
describe('registerDonutSpriteResolver', () => {
  const fakeMap = () => {
    const images = new Map<string, unknown>();
    let resolver: ((id: string) => Promise<void>) | null = null;
    return {
      images,
      ask: (id: string) => resolver?.(id) ?? Promise.resolve(),
      hasResolver: () => resolver !== null,
      setMissingStyleImageResolver(next: (id: string) => Promise<void>) { resolver = next; },
      hasImage: (id: string) => images.has(id),
      addImage: (id: string, image: unknown) => { images.set(id, image); },
    };
  };

  it('installs a resolver without rasterizing anything', async () => {
    const map = fakeMap();
    registerDonutSpriteResolver(map as never);
    expect(map.hasResolver()).toBe(true);
    expect(map.images.size).toBe(0);
  });

  it('generates exactly the sprite that was asked for', async () => {
    const map = fakeMap();
    registerDonutSpriteResolver(map as never);
    await map.ask(donutSpriteId(6, 3));

    expect([...map.images.keys()]).toEqual([donutSpriteId(6, 3)]);
  });

  it('ignores ids that are not donuts, so other resolvers still get a turn', async () => {
    const map = fakeMap();
    registerDonutSpriteResolver(map as never);
    await map.ask('pin-arsa');
    await map.ask('something-else');

    expect(map.images.size).toBe(0);
  });

  it('does not redraw a sprite it has already registered', async () => {
    const map = fakeMap();
    registerDonutSpriteResolver(map as never);
    await map.ask(donutSpriteId(2, 2));
    const first = map.images.get(donutSpriteId(2, 2));
    await map.ask(donutSpriteId(2, 2));

    expect(map.images.get(donutSpriteId(2, 2))).toBe(first);
  });

  // A malformed id must not reject: MapLibre awaits this, and an unhandled
  // rejection here would surface as a broken style rather than a missing icon.
  it('survives an id shaped like a donut but carrying nonsense', async () => {
    const map = fakeMap();
    registerDonutSpriteResolver(map as never);
    await expect(map.ask('donut-x-y')).resolves.toBeUndefined();
    expect(map.images.size).toBe(0);
  });
});
