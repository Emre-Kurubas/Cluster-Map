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
export const DONUT_SIZE = { width: 96, height: 124 } as const;

/**
 * Where the head sits inside the sprite box, in sprite units.
 *
 * The cluster layer needs this to place the count: the icon is anchored by its
 * tip, so the number has to be pushed back up into the head, and how far
 * depends on this number rather than on a figure copied by hand.
 */
export const HEAD_CENTER = { x: 48, y: 48 } as const;
export const HEAD_RADIUS = 36;
/** Distance from the head centre down to the tip, in sprite units. */
export const TIP_OFFSET = 65;

/**
 * Width of the coloured band, centred on the outline.
 *
 * It rides the pin's own contour rather than a circle inside the head, so the
 * category mix reads all the way down to the tip — the shape carries the
 * colours instead of housing them.
 */
const BAND_WIDTH = 9;

/**
 * Total path length the segments are measured against.
 *
 * Declared on the path with SVG's `pathLength`, which rescales dasharray and
 * dashoffset to whatever number is given. That is the whole reason this works
 * without geometry: the real length of an arc plus two cubics would otherwise
 * have to be integrated by hand, and `getTotalLength` is a DOM call these
 * sprites are built too early — and in tests, too headlessly — to make.
 */
const BAND_LENGTH = 100;

/**
 * How far the outermost halo stroke reaches past the outline.
 *
 * Has to clear the band, or the shadow would be painted over by it and the pin
 * would sit flat on the map again.
 */
export const HALO_BLEED = 9;

/**
 * A teardrop: a full circle for the head, then one cubic down each side meeting
 * at the tip. The cubics leave the circle where its tangent is already vertical
 * (its leftmost and rightmost points), so the joins are smooth rather than
 * kinked — which is the whole difference between this and a triangle stuck to a
 * disc.
 *
 * The control points are expressed as fractions of the head radius and the tip
 * distance, so the silhouette holds its proportions if either is retuned.
 */
const BODY_PATH = [
  `M ${HEAD_CENTER.x - HEAD_RADIUS} ${HEAD_CENTER.y}`,
  `A ${HEAD_RADIUS} ${HEAD_RADIUS} 0 1 1 ${HEAD_CENTER.x + HEAD_RADIUS} ${HEAD_CENTER.y}`,
  `C ${HEAD_CENTER.x + HEAD_RADIUS} ${HEAD_CENTER.y + 0.45 * HEAD_RADIUS},`
    + ` ${HEAD_CENTER.x + 0.5 * HEAD_RADIUS} ${HEAD_CENTER.y + 0.47 * TIP_OFFSET},`
    + ` ${HEAD_CENTER.x} ${HEAD_CENTER.y + TIP_OFFSET}`,
  `C ${HEAD_CENTER.x - 0.5 * HEAD_RADIUS} ${HEAD_CENTER.y + 0.47 * TIP_OFFSET},`
    + ` ${HEAD_CENTER.x - HEAD_RADIUS} ${HEAD_CENTER.y + 0.45 * HEAD_RADIUS},`
    + ` ${HEAD_CENTER.x - HEAD_RADIUS} ${HEAD_CENTER.y}`,
  'Z',
].join(' ');

/**
 * Round, everywhere, on every stroke of this path.
 *
 * The tip is a ~56° corner. A miter join there runs 2.1× the stroke width past
 * the point — nearly 19px for the widest halo stroke — which spikes out of the
 * sprite box and gets clipped into a flat grey stub.
 */
const JOIN = 'stroke-linejoin="round"';

/**
 * Just enough to hold the outline, and no more.
 *
 * A firmer edge did separate the pin from the basemap, but it drew a hard dark
 * rim that read as a sticker cut out and laid on the map. The separation should
 * come from the halo's falloff, not from a line.
 */
const EDGE_COLOR = 'rgba(34,49,63,0.16)';

/** How many strokes the halo is built from. More steps, smoother ramp. */
const HALO_STEPS = 7;
/** Per-stroke alpha. They composite, so the ramp is what this adds up to. */
const HALO_ALPHA = 0.045;

/**
 * A soft shadow, built from concentric strokes of the same outline.
 *
 * The pin is white on a near-white basemap, so without something behind it the
 * silhouette dissolves. `feGaussianBlur` would be the obvious answer, but these
 * sprites are rasterized by drawing the SVG through an HTMLImageElement, and
 * filter support down that path is not something to bet a sprite on.
 *
 * Each stroke is centred on the outline and covers ±width/2, so overlapping
 * them stacks up density towards the edge and thins out away from it — a
 * falloff, drawn without a filter. Three steps banded visibly; seven at a
 * lighter alpha reach the same depth as a gradient instead of as rings.
 */
const SHADOW_STROKES = Array.from({ length: HALO_STEPS }, (_, step) => {
  // Widest first, so later strokes paint over the middle of earlier ones. The
  // narrowest still clears the band, which is drawn over everything below it.
  const spread = HALO_BLEED * 2 - BAND_WIDTH;
  const width = BAND_WIDTH + spread * (1 - step / HALO_STEPS);
  return `<path d="${BODY_PATH}" fill="none" stroke="rgba(34,49,63,${HALO_ALPHA})" stroke-width="${width.toFixed(2)}" ${JOIN}/>`;
}).join('\n  ');

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
 * A map pin whose whole outline is banded by category share.
 *
 * The pie is unchanged as a scheme — same tenths, same colours, same rule that
 * a category with nothing in it draws nothing. What changed is what the pie is
 * drawn on. It used to be a circle floating inside the head, which left the
 * pin's own shape uncoloured and read as a badge that happened to be pinned to
 * something. Stroking the shares onto the body path instead carries the mix
 * around the head, down both flanks and through the tip: the silhouette is the
 * chart.
 *
 * Segments are `stroke-dasharray` runs on one copy of the path each, rather
 * than sliced sub-paths — a share that covers the whole outline degenerates
 * into a solid stroke instead of collapsing, and no segment needs its endpoints
 * solved for.
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
      const length = (tenths / DONUT_STEPS) * BAND_LENGTH;
      const offset = -(consumed / DONUT_STEPS) * BAND_LENGTH;
      consumed += tenths;
      return `<path d="${BODY_PATH}" pathLength="${BAND_LENGTH}" fill="none" stroke="${color}" stroke-width="${BAND_WIDTH}" stroke-dasharray="${length.toFixed(2)} ${(BAND_LENGTH - length).toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" ${JOIN}/>`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${DONUT_SIZE.width}" height="${DONUT_SIZE.height}" viewBox="0 0 ${DONUT_SIZE.width} ${DONUT_SIZE.height}">
  ${SHADOW_STROKES}
  <path class="body" d="${BODY_PATH}" fill="#ffffff" stroke="${EDGE_COLOR}" stroke-width="1.25" ${JOIN}/>
  <g class="ring">
    ${segments}
  </g>
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
        const pixels = await rasterizeSvg(
          buildDonutSvg(a, b), DONUT_SIZE.width, DONUT_SIZE.height,
        );
        map.addImage(id, pixels, { pixelRatio: 2 });
      } catch (error) {
        console.warn(`[ListingMap] cluster icon "${id}" failed to load`, error);
      }
    }),
  );
}
