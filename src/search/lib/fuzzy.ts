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

/**
 * Character-histogram lower bound on edit distance.
 *
 * Every edit changes the character multiset by at most 2 (one removal plus one
 * insertion), so `distance >= sumAbsDiff / 2`. When that bound already exceeds
 * the cap we can reject without running the O(n·m) DP at all. This is exact —
 * it never rejects a pair the DP would have accepted — and it screens out the
 * overwhelming majority of candidates, which is what keeps fuzzy search inside
 * its frame budget on large datasets.
 */
function exceedsHistogramBound(a: string, b: string, maxDistance: number): boolean {
  const counts = new Map<string, number>();
  for (const char of a) counts.set(char, (counts.get(char) ?? 0) + 1);
  for (const char of b) counts.set(char, (counts.get(char) ?? 0) - 1);

  let sumAbsDiff = 0;
  for (const value of counts.values()) sumAbsDiff += Math.abs(value);

  return sumAbsDiff > maxDistance * 2;
}

/** How well a single query token matches a single candidate token. 0..1. */
export function tokenScore(needle: string, candidate: string): number {
  if (!needle || !candidate) return 0;
  if (needle === candidate) return 1;
  if (candidate.startsWith(needle)) return 0.8;
  if (needle.length < MIN_FUZZY_LENGTH) return 0;
  if (Math.abs(needle.length - candidate.length) > 2) return 0;
  if (exceedsHistogramBound(needle, candidate, 2)) return 0;

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

    // A perfect title hit already dominates any possible body hit, so there is
    // nothing to gain from scanning the body tokens as well.
    if (titleHit === TITLE_WEIGHT) {
      total += titleHit;
      continue;
    }

    const bodyHit = bestScore(token, indexed.bodyTokens) * BODY_WEIGHT;
    const best = Math.max(titleHit, bodyHit);
    if (best === 0) return 0;
    total += best;
  }
  return total;
}
