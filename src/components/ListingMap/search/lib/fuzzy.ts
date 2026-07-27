import type { IndexedListing } from '../../types/listing';

const TITLE_WEIGHT = 2;
const BODY_WEIGHT = 1;
/** Below this length, a typo allowance would match almost anything. */
const MIN_FUZZY_LENGTH = 4;

/**
 * Levenshtein distance that stops early once it provably exceeds maxDistance.
 * Returns maxDistance + 1 as the "too far" sentinel rather than the real value.
 */
export function boundedLevenshtein(a: string, b: string, maxDistance: number): number {
  const tooFar = maxDistance + 1;
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDistance) return tooFar;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
      if (current[j] < rowMin) rowMin = current[j];
    }
    if (rowMin > maxDistance) return tooFar;
    [previous, current] = [current, previous];
  }

  const distance = previous[b.length];
  return distance > maxDistance ? tooFar : distance;
}

/** How well a single query token matches a single candidate token. 0..1. */
export function tokenScore(needle: string, candidate: string): number {
  if (!needle || !candidate) return 0;
  if (needle === candidate) return 1;
  if (candidate.startsWith(needle)) return 0.8;
  if (needle.length < MIN_FUZZY_LENGTH) return 0;

  const distance = boundedLevenshtein(needle, candidate, 2);
  if (distance === 1) return 0.6;
  if (distance === 2) return 0.4;
  return 0;
}

function bestScore(needle: string, candidates: string[]): number {
  let best = 0;
  for (const candidate of candidates) {
    const score = tokenScore(needle, candidate);
    if (score > best) best = score;
    if (best === 1) break;
  }
  return best;
}

/**
 * Total relevance of a listing for a query. Returns 0 unless every query token
 * matched something — search should narrow results, never widen them.
 */
export function scoreListing(indexed: IndexedListing, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;

  let total = 0;
  for (const token of queryTokens) {
    const titleHit = bestScore(token, indexed.titleTokens) * TITLE_WEIGHT;
    const bodyHit = bestScore(token, indexed.bodyTokens) * BODY_WEIGHT;
    const best = Math.max(titleHit, bodyHit);
    if (best === 0) return 0;
    total += best;
  }
  return total;
}
