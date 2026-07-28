const FULL = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

/** "4.157.000 ₺" — used wherever an exact figure matters. */
export function formatPrice(value: number): string {
  return `${FULL.format(value)} ₺`;
}

/** "4.157.000" — grouped digits, no unit, for fields that carry their own. */
export function formatAmount(value: number): string {
  return FULL.format(value);
}

/**
 * The number a person typed into such a field, or null if they typed nothing.
 *
 * Everything but the digits is dropped, which is what makes the grouping the
 * field itself prints ("4.157.000") re-readable. A comma is a decimal separator
 * in tr-TR, so "1,5" reads as 15 — right for the locale, and beside the point at
 * the scale these prices are at.
 */
export function parseAmount(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}

/** "4,2 mn ₺" — used in dense contexts like list rows and cluster labels. */
export function formatPriceCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${ONE_DECIMAL.format(value / 1_000_000)} mn ₺`;
  }
  if (value >= 1_000) {
    return `${FULL.format(Math.round(value / 1_000))} bin ₺`;
  }
  return `${FULL.format(value)} ₺`;
}
