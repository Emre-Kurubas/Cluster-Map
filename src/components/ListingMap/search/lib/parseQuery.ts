import { tokenize } from '../../lib/normalize';
import { formatPrice } from '../../lib/formatPrice';
import { findProvinceInTokens } from './gazetteer';
import { parsePriceExpression } from './priceExpressions';
import { CATEGORY_SYNONYMS } from './categorySynonyms';
import type { Chip, ParsedQuery } from '../../types/filters';
import type { BBox } from '../../types/map';

function priceLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return `${formatPrice(min).replace(' ₺', '')} – ${formatPrice(max)}`;
  }
  if (max !== null) return `≤ ${formatPrice(max)}`;
  return `≥ ${formatPrice(min!)}`;
}

/**
 * Turn a raw query into removable filter chips plus leftover text.
 *
 * Matchers run in a fixed order — province, price, category — and each one
 * consumes its tokens so later matchers and the fuzzy scorer never see them.
 * Only the first hit of each kind is taken; extra mentions fall through to the
 * residual, where fuzzy search can still use them.
 */
export function parseQuery(raw: string): ParsedQuery {
  const tokens = tokenize(raw);
  if (tokens.length === 0) return { chips: [], residual: '', flyTo: null };

  const consumed = new Set<number>();
  const chips: Chip[] = [];
  let flyTo: BBox | null = null;

  const province = findProvinceInTokens(tokens);
  if (province) {
    province.indices.forEach((i) => consumed.add(i));
    flyTo = province.province.bbox;
    chips.push({
      id: `province:${province.province.normalized}`,
      kind: 'province',
      label: province.province.name,
      province: province.province.name,
    });
  }

  const remainingForPrice = tokens.map((t, i) => (consumed.has(i) ? '' : t));
  const price = parsePriceExpression(remainingForPrice);
  if (price) {
    price.indices.forEach((i) => consumed.add(i));
    chips.push({
      id: `price:${price.min ?? 0}:${price.max ?? 0}`,
      kind: 'price',
      label: priceLabel(price.min, price.max),
      priceMin: price.min,
      priceMax: price.max,
    });
  }

  for (let i = 0; i < tokens.length; i += 1) {
    if (consumed.has(i)) continue;
    const category = CATEGORY_SYNONYMS[tokens[i]];
    if (category) {
      consumed.add(i);
      chips.push({
        id: `category:${category}`,
        kind: 'category',
        label: category,
        category,
      });
      break;
    }
  }

  const residual = tokens.filter((_, i) => !consumed.has(i)).join(' ');
  return { chips, residual, flyTo };
}
