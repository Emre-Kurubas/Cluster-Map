export interface PriceExpression {
  min: number | null;
  max: number | null;
  /** Token indices consumed by this expression. */
  indices: number[];
}

const MULTIPLIERS: Record<string, number> = {
  bin: 1_000,
  milyon: 1_000_000,
  mn: 1_000_000,
  milyar: 1_000_000_000,
};

const BELOW = new Set(['alti', 'altinda', 'az', 'asagi', 'maksimum', 'max', 'kadar']);
const ABOVE = new Set(['ustu', 'uzeri', 'uzerinde', 'fazla', 'yukari', 'minimum', 'min']);
const RANGE = new Set(['arasi', 'arasinda', 'ile', 've']);
const CURRENCY = new Set(['tl', 'lira', 'try']);

/** Smallest figure we will treat as a price, to avoid matching years. */
const MIN_PLAUSIBLE_PRICE = 10_000;

function asNumber(token: string): number | null {
  if (!/^\d+$/.test(token)) return null;
  return Number(token);
}

/** "2m" / "1.5mn" style shorthand written as a single token. */
function asShorthand(token: string): number | null {
  const match = /^(\d+)(m|mn|milyon|b|bin|k)$/.exec(token);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 'm' || unit === 'mn' || unit === 'milyon') return value * 1_000_000;
  return value * 1_000;
}

/**
 * Find a price expression anywhere in the token stream.
 *
 * Recognized shapes:
 *   <n> <multiplier> <below|above>     → 2 milyon altı
 *   <n> <n> <multiplier> <range>       → 1 3 milyon arası
 *   <n> <multiplier>                   → 2 milyon        (treated as a ceiling)
 *   <bigN> <currency?>                 → 2000000 tl      (treated as a ceiling)
 *   <shorthand>                        → 2m
 *
 * A bare number with no multiplier, currency word, or shorthand suffix is
 * ignored — "2024/2679 Esas" and "500m2" must not read as prices.
 */
export function parsePriceExpression(tokens: string[]): PriceExpression | null {
  for (let i = 0; i < tokens.length; i += 1) {
    const shorthand = asShorthand(tokens[i]);
    if (shorthand !== null) {
      const next = tokens[i + 1];
      if (next && ABOVE.has(next)) {
        return { min: shorthand, max: null, indices: [i, i + 1] };
      }
      if (next && BELOW.has(next)) {
        return { min: null, max: shorthand, indices: [i, i + 1] };
      }
      return { min: null, max: shorthand, indices: [i] };
    }

    const first = asNumber(tokens[i]);
    if (first === null) continue;

    const second = asNumber(tokens[i + 1] ?? '');
    const multiplierAfterPair = MULTIPLIERS[tokens[i + 2] ?? ''];

    // "1 3 milyon arası"
    if (second !== null && multiplierAfterPair) {
      const indices = [i, i + 1, i + 2];
      if (RANGE.has(tokens[i + 3] ?? '')) indices.push(i + 3);
      return {
        min: first * multiplierAfterPair,
        max: second * multiplierAfterPair,
        indices,
      };
    }

    const multiplier = MULTIPLIERS[tokens[i + 1] ?? ''];
    if (multiplier) {
      const value = first * multiplier;
      const qualifier = tokens[i + 2] ?? '';
      if (ABOVE.has(qualifier)) {
        return { min: value, max: null, indices: [i, i + 1, i + 2] };
      }
      if (BELOW.has(qualifier)) {
        return { min: null, max: value, indices: [i, i + 1, i + 2] };
      }
      return { min: null, max: value, indices: [i, i + 1] };
    }

    // Bare figure — only a price if a currency word backs it up.
    if (first >= MIN_PLAUSIBLE_PRICE && CURRENCY.has(tokens[i + 1] ?? '')) {
      const qualifier = tokens[i + 2] ?? '';
      if (ABOVE.has(qualifier)) {
        return { min: first, max: null, indices: [i, i + 1, i + 2] };
      }
      return { min: null, max: first, indices: [i, i + 1] };
    }
  }

  return null;
}
