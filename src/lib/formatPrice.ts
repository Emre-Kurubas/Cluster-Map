const FULL = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 });

/** "4.157.000 ₺" — used wherever an exact figure matters. */
export function formatPrice(value: number): string {
  return `${FULL.format(value)} ₺`;
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
