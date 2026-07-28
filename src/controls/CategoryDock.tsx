import { GlassPanel } from '../ui/GlassPanel';
import { CategoryFilter } from '../filters/CategoryFilter';
import { t } from '../i18n/tr';

/**
 * The category legend, docked bottom-right above the zoom controls.
 *
 * It used to sit inside the filter disclosure with price and sort. Category is
 * the one filter that doubles as the map's legend — the swatch colours are the
 * pin colours — so hiding it behind a toggle cost the user the key to what they
 * were looking at. Price and sort stay in the panel; this comes out.
 *
 * A single low strip beside the zoom stack rather than a block above it: the
 * legend then costs the corner no extra height, and the two sit on one
 * baseline so the corner reads as one row of map controls.
 */
export function CategoryDock() {
  return (
    <GlassPanel
      role="region"
      aria-label={t.categories}
      className="pointer-events-auto p-1
                 motion-safe:animate-[detail-in_200ms_var(--ease-spring)]"
    >
      <CategoryFilter />
    </GlassPanel>
  );
}
