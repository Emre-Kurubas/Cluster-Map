import type { Category } from '../types/listing';

export interface CategoryConfig {
  id: Category;
  /** Sprite image id registered via map.addImage(). ASCII only. */
  iconId: string;
  color: string;
  /** Tailwind class for the swatch in filter chips. */
  swatchClass: string;
}

export const CATEGORIES: Record<Category, CategoryConfig> = {
  Gayrimenkul: {
    id: 'Gayrimenkul',
    iconId: 'pin-gayrimenkul',
    color: '#4f6bd1',
    swatchClass: 'bg-cat-gayrimenkul',
  },
  Arsa: {
    id: 'Arsa',
    iconId: 'pin-arsa',
    color: '#3d9a82',
    swatchClass: 'bg-cat-arsa',
  },
  'Araç': {
    id: 'Araç',
    iconId: 'pin-arac',
    color: '#e0912f',
    swatchClass: 'bg-cat-arac',
  },
};

export const CATEGORY_LIST: Category[] = ['Gayrimenkul', 'Arsa', 'Araç'];

export function getCategoryConfig(category: Category): CategoryConfig {
  return CATEGORIES[category];
}
