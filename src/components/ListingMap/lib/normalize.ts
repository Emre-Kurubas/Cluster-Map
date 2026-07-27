const FOLD_MAP: Record<string, string> = {
  ı: 'i', İ: 'i', I: 'i', ş: 's', Ş: 's', ğ: 'g', Ğ: 'g',
  ü: 'u', Ü: 'u', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
  â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u',
};

/**
 * Lowercase and diacritic-fold Turkish text for matching.
 *
 * `İ` is folded before lowercasing because JS's default toLowerCase turns it
 * into "i̇" (i + combining dot), which breaks equality against a typed "i".
 * Dotless `I` also folds to `i` rather than `ı` — users type either one and
 * expect both to match.
 */
export function normalizeTr(input: string): string {
  if (!input) return '';
  let out = '';
  for (const char of input) {
    out += FOLD_MAP[char] ?? char;
  }
  return out
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize, then split into alphanumeric tokens. */
export function tokenize(input: string): string[] {
  const normalized = normalizeTr(input);
  if (!normalized) return [];
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}
