import type { LayerSpecification } from 'maplibre-gl';
import { LAYER_PINS, LAYER_PINS_ACTIVE, SOURCE_ID } from '../../config/mapStyle';
import { CATEGORIES, CATEGORY_LIST } from '../../config/categories';

/**
 * Category values carry Turkish characters ("Araç") but sprite ids must stay
 * ASCII, so the layer maps between them with a `match` expression. The final
 * element is the fallback sprite, used if the data ever carries an unknown
 * category — a missing icon-image would otherwise drop the pin silently.
 */
function buildIconExpression(): unknown[] {
  const expression: unknown[] = ['match', ['get', 'category']];
  for (const category of CATEGORY_LIST) {
    expression.push(category, CATEGORIES[category].iconId);
  }
  expression.push(CATEGORIES.Gayrimenkul.iconId);
  return expression;
}

/** Matches nothing. The starting filter for the highlight layer. */
export const MATCH_NOTHING = ['in', ['get', 'id'], ['literal', []]];

/**
 * One symbol layer draws every category pin. The icon is selected by data
 * expression rather than by one layer per category, so adding a category
 * costs a sprite entry and nothing else.
 */
export function buildPinLayer(): LayerSpecification {
  return {
    id: LAYER_PINS,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    layout: {
      // Cast: the expression is built dynamically, so it cannot be narrowed to
      // ExpressionSpecification at compile time. Shape is pinned by the tests.
      'icon-image': buildIconExpression() as never,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-anchor': 'bottom',
      'icon-size': 1,
    },
    paint: {
      'icon-opacity': [
        'interpolate', ['linear'], ['zoom'],
        6, 0.85,
        9, 1,
      ],
    },
  };
}

/**
 * Enlarged copy of the pin layer, drawn above it and filtered to the hovered
 * and selected ids.
 *
 * `icon-size` is a layout property and MapLibre rejects `feature-state` in
 * layout properties — attempting it made addLayer throw, which left the map
 * with no pin layer at all. Swapping this layer's filter achieves the same
 * effect, still costs no React render, and still never touches the source.
 */
export function buildActivePinLayer(): LayerSpecification {
  return {
    id: LAYER_PINS_ACTIVE,
    type: 'symbol',
    source: SOURCE_ID,
    filter: MATCH_NOTHING as never,
    layout: {
      'icon-image': buildIconExpression() as never,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-anchor': 'bottom',
      'icon-size': 1.3,
    },
    paint: {
      'icon-opacity': 1,
    },
  };
}
