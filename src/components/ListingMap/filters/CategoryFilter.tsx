import { Chip } from '../ui/Chip';
import { CATEGORY_LIST, getCategoryConfig } from '../config/categories';
import { useListingStore } from '../store/useListingStore';

export function CategoryFilter() {
  const categories = useListingStore((state) => state.filters.categories);
  const toggleCategory = useListingStore((state) => state.toggleCategory);

  return (
    <div className="flex items-center gap-1.5">
      {CATEGORY_LIST.map((category) => (
        <Chip
          key={category}
          label={category}
          active={categories.includes(category)}
          swatchClass={getCategoryConfig(category).swatchClass}
          onClick={() => toggleCategory(category)}
        />
      ))}
    </div>
  );
}
