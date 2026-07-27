import { CATEGORY_LIST, getCategoryConfig } from '../config/categories';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';
import type { Category } from '../types/listing';

/**
 * The legend, one item per category, laid out in a single row.
 *
 * Every category starts visible — that is what the map is showing — so a click
 * takes one away rather than adding it. Crossing the label out says "this is
 * off" far more directly than an unfilled chip, which reads as "not yet
 * chosen".
 */
export function CategoryFilter() {
  const hidden = useListingStore((state) => state.filters.hiddenCategories);
  const toggle = useListingStore((state) => state.toggleCategoryVisibility);

  return (
    <div className="flex items-center gap-0.5">
      {CATEGORY_LIST.map((category) => (
        <LegendItem
          key={category}
          category={category}
          visible={!hidden.includes(category)}
          onToggle={() => toggle(category)}
        />
      ))}
    </div>
  );
}

interface LegendItemProps {
  category: Category;
  visible: boolean;
  onToggle(): void;
}

function LegendItem({ category, visible, onToggle }: LegendItemProps) {
  const { color } = getCategoryConfig(category);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      title={visible ? t.hideCategory(category) : t.showCategory(category)}
      className={[
        'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm',
        'font-medium transition-colors duration-200 hover:bg-ink-900/5',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500',
        visible ? 'text-ink-900' : 'text-ink-300',
      ].join(' ')}
    >
      {/* Filled while the category is on the map, a hollow ring once it is
          off — the same read as the pin being there or not. */}
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full border-2 transition-[background-color] duration-200"
        style={{
          borderColor: color,
          backgroundColor: visible ? color : 'transparent',
        }}
      />
      <span className={visible ? '' : 'line-through decoration-2'}>{category}</span>
    </button>
  );
}
