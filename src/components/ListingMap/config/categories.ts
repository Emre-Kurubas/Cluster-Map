import type { Category } from '../types/listing';

export interface CategoryConfig {
  id: Category;
  /** Sprite image id registered via map.addImage(). ASCII only. */
  iconId: string;
  color: string;
  /**
   * A darkened `color` that clears WCAG AA behind white text (all three sit at
   * 5.1–5.7:1). The plain colours do not — `color` for Araç is only 2.5:1 — so
   * anything that fills a control carrying a white label uses this instead.
   */
  strongColor: string;
  /** Tailwind class for the swatch in filter chips. */
  swatchClass: string;
}

export const CATEGORIES: Record<Category, CategoryConfig> = {
  Gayrimenkul: {
    id: 'Gayrimenkul',
    iconId: 'pin-gayrimenkul',
    color: '#4f6bd1',
    strongColor: '#4560bd',
    swatchClass: 'bg-cat-gayrimenkul',
  },
  Arsa: {
    id: 'Arsa',
    iconId: 'pin-arsa',
    color: '#3d9a82',
    strongColor: '#2f7a66',
    swatchClass: 'bg-cat-arsa',
  },
  'Araç': {
    id: 'Araç',
    iconId: 'pin-arac',
    color: '#e0912f',
    strongColor: '#965f14',
    swatchClass: 'bg-cat-arac',
  },
};

export const CATEGORY_LIST: Category[] = ['Gayrimenkul', 'Arsa', 'Araç'];

export function getCategoryConfig(category: Category): CategoryConfig {
  return CATEGORIES[category];
}
