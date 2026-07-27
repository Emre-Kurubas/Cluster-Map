import type { Map as MapLibreMap } from 'maplibre-gl';
import { getCategoryConfig } from '../../config/categories';
import { rasterizeSvg } from './pinShapes';

/**
 * Resolution of the category mix, in tenths.
 *
 * Every reachable mix becomes one pre-rendered sprite, so this is a direct
 * trade of fidelity against sprite count: tenths give 66 sprites, twentieths
 * would give 231 for a difference nobody can see at cluster size.
 */
export const DONUT_STEPS = 10;

/** Rasterized at 2× and halved by pixelRatio, so the ring stays crisp. */
export const DONUT_SIZE = 96;

const CENTER = DONUT_SIZE / 2;
const RADIUS = 36;
const RING_WIDTH = 13;
const HOLE_RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Sprite id for a mix, named by the first two shares — the third is whatever is
 * left, so it carries no information of its own.
 */
export function donutSpriteId(gayrimenkul: number, arsa: number): string {
  return `donut-${gayrimenkul}-${arsa}`;
}

/** Every mix the layer expression can ask for. */
export function donutSpriteIds(): string[] {
  const ids: string[] = [];
  for (let a = 0; a <= DONUT_STEPS; a += 1) {
    for (let b = 0; b <= DONUT_STEPS - a; b += 1) ids.push(donutSpriteId(a, b));
  }
  return ids;
}

/**
 * A ring segmented by category share, with a hole for the cluster count.
 *
 * Drawn with `stroke-dasharray` on one circle per segment rather than arc
 * paths: no trigonometry, and a segment that covers the whole ring degenerates
 * correctly instead of collapsing the way a 360° arc path does.
 */
export function buildDonutSvg(gayrimenkul: number, arsa: number): string {
  const arac = DONUT_STEPS - gayrimenkul - arsa;
  const shares: [number, string][] = [
    [gayrimenkul, getCategoryConfig('Gayrimenkul').color],
    [arsa, getCategoryConfig('Arsa').color],
    [arac, getCategoryConfig('Araç').color],
  ];

  let consumed = 0;
  const segments = shares
    .filter(([tenths]) => tenths > 0)
    .map(([tenths, color]) => {
      const length = (tenths / DONUT_STEPS) * CIRCUMFERENCE;
      const offset = -(consumed / DONUT_STEPS) * CIRCUMFERENCE;
      consumed += tenths;
      return `<circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="none" stroke="${color}" stroke-width="${RING_WIDTH}" stroke-dasharray="${length.toFixed(2)} ${(CIRCUMFERENCE - length).toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/>`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DONUT_SIZE}" height="${DONUT_SIZE}" viewBox="0 0 ${DONUT_SIZE} ${DONUT_SIZE}">
  <g transform="rotate(-90 ${CENTER} ${CENTER})">
    <circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="${RING_WIDTH + 5}"/>
    ${segments}
  </g>
  <circle class="hole" cx="${CENTER}" cy="${CENTER}" r="${HOLE_RADIUS}" fill="rgba(255,255,255,0.94)"/>
</svg>`;
}

/**
 * Register every donut sprite.
 *
 * Like the pins, this never rejects: it runs inside the map's `load` handler
 * ahead of source and layer registration, and a missing icon must not cost the
 * map its layers.
 */
export async function loadDonutImages(map: MapLibreMap): Promise<void> {
  await Promise.all(
    donutSpriteIds().map(async (id) => {
      try {
        if (map.hasImage(id)) return;
        const [, a, b] = id.split('-').map(Number);
        const pixels = await rasterizeSvg(buildDonutSvg(a, b), DONUT_SIZE, DONUT_SIZE);
        map.addImage(id, pixels, { pixelRatio: 2 });
      } catch (error) {
        console.warn(`[ListingMap] cluster icon "${id}" failed to load`, error);
      }
    }),
  );
}
