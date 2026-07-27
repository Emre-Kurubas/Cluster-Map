import type { Map as MapLibreMap } from 'maplibre-gl';
import { CATEGORY_LIST, getCategoryConfig } from '../../config/categories';
import type { Category } from '../../types/listing';

/** Rendered at 2× and downscaled by icon-size, so pins stay crisp on retina. */
export const PIN_SIZE = { width: 56, height: 72 } as const;

/**
 * Distinct silhouettes per category so the map stays readable in greyscale and
 * for color-vision-deficient users — color alone is never the only signal.
 */
const BODY_PATHS: Record<Category, string> = {
  // Rounded teardrop.
  Gayrimenkul:
    'M28 8 C16 8 8 16 8 28 C8 38 16 44 28 62 C40 44 48 38 48 28 C48 16 40 8 28 8 Z',
  // Diamond on a stem.
  Arsa:
    'M28 6 L48 26 L28 62 L8 26 Z',
  // Circle on a stem.
  'Araç':
    'M28 8 C39 8 48 17 48 28 C48 39 39 46 28 62 C17 46 8 39 8 28 C8 17 17 8 28 8 Z',
};

const GLYPHS: Record<Category, string> = {
  Gayrimenkul:
    '<path d="M20 30 L28 22 L36 30 V38 H30 V32 H26 V38 H20 Z" fill="#fff"/>',
  Arsa:
    '<path d="M18 24 H38 V34 H18 Z M18 29 H38" fill="none" stroke="#fff" stroke-width="2.5"/>',
  'Araç':
    '<path d="M18 32 L20 25 H36 L38 32 V37 H34 V34 H22 V37 H18 Z" fill="#fff"/>',
};

/** An SVG string for one category pin, colored from config/categories.ts. */
export function buildPinSvg(category: Category): string {
  const { color } = getCategoryConfig(category);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_SIZE.width}" height="${PIN_SIZE.height}" viewBox="0 0 56 72">
  <path d="${BODY_PATHS[category]}" class="body" fill="${color}" stroke="#ffffff" stroke-width="3"/>
  ${GLYPHS[category]}
</svg>`;
}

/**
 * Rasterize an SVG string to pixels.
 *
 * Deliberately goes through HTMLImageElement + canvas rather than
 * `createImageBitmap(svgBlob)`. Chrome cannot decode SVG through
 * createImageBitmap at all — it throws "The source image could not be decoded"
 * — and only Firefox supports it. Drawing via an Image element works
 * everywhere, which is why the extra hop is here.
 */
/**
 * Upper bound on decoding one pin. An image element that neither loads nor
 * errors would otherwise leave the promise pending forever, and because this
 * is awaited inside the map's `load` handler that would stall source and layer
 * registration permanently. Failing beats hanging.
 */
export const SPRITE_LOAD_TIMEOUT_MS = 3000;

export async function rasterizeSvg(
  svg: string,
  width: number,
  height: number,
): Promise<ImageData> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image(width, height);
    let timer: ReturnType<typeof setTimeout> | undefined;

    await new Promise<void>((resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error('SVG decode timed out')),
        SPRITE_LOAD_TIMEOUT_MS,
      );
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('SVG could not be decoded'));
      image.src = url;
    }).finally(() => clearTimeout(timer));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas context unavailable');

    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Rasterize each pin SVG and register it under its ASCII sprite id.
 *
 * Never rejects. This runs inside the map's `load` handler, ahead of source and
 * layer registration — an unhandled rejection here previously aborted that
 * whole sequence, leaving the map with no source, no layers and a permanently
 * empty listing count. A missing icon should cost an icon, not the map.
 */
export async function loadPinImages(map: MapLibreMap): Promise<void> {
  await Promise.all(
    CATEGORY_LIST.map(async (category) => {
      const { iconId } = getCategoryConfig(category);
      try {
        if (map.hasImage(iconId)) return;
        const pixels = await rasterizeSvg(
          buildPinSvg(category), PIN_SIZE.width, PIN_SIZE.height,
        );
        map.addImage(iconId, pixels, { pixelRatio: 2 });
      } catch (error) {
        console.warn(`[ListingMap] pin icon "${iconId}" failed to load`, error);
      }
    }),
  );
}
