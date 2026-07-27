import { GlassPanel } from '../ui/GlassPanel';
import { CategoryFilter } from '../filters/CategoryFilter';
import { t } from '../i18n/tr';

/**
 * The category toggles, docked bottom-right above the zoom controls.
 *
 * They used to sit inside the filter disclosure with price and sort. Category
 * is the one filter that doubles as the map's legend — the chip colours are the
 * pin colours — so hiding it behind a toggle cost the user the key to what they
 * were looking at. Price and sort stay in the panel; these come out.
 */
export function CategoryDock() {
  return (
    <GlassPanel
      role="region"
      aria-label={t.categories}
      className="pointer-events-auto px-2.5 py-2
                 motion-safe:animate-[detail-in_200ms_var(--ease-spring)]"
    >
      <CategoryFilter />
    </GlassPanel>
  );
}
