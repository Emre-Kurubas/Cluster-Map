import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';
import type { SortMode } from '../types/filters';

export function SortControl() {
  const sort = useListingStore((state) => state.sort);
  const setSort = useListingStore((state) => state.setSort);

  return (
    <select
      aria-label={t.sort}
      value={sort}
      onChange={(event) => setSort(event.target.value as SortMode)}
      className="rounded-lg border border-line bg-white/70 px-2.5 py-1.5 text-sm
                 text-ink-500 outline-none transition-colors duration-200
                 focus:border-brand-500 focus-visible:outline-2
                 focus-visible:outline-brand-500"
    >
      <option value="relevance">{t.sortRelevance}</option>
      <option value="price-asc">{t.sortPriceAsc}</option>
      <option value="price-desc">{t.sortPriceDesc}</option>
    </select>
  );
}
