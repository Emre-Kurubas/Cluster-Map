import { GlassPanel } from '../ui/GlassPanel';
import { IconButton } from '../ui/IconButton';
import { t } from '../i18n/tr';
import type { MapEngine } from '../types/map';

/**
 * One glass plate holding all three, not three separate ones.
 *
 * They were the only chrome on the map wearing a different surface — an opaquer
 * white with no blur behind it — so the corner read as two unrelated widgets
 * next to each other rather than one set of map controls. Sharing a panel with
 * the legend's treatment settles that, and it also drops the blur from three
 * layers to one.
 */
export interface MapControlsProps {
  engine: MapEngine | null;
}

export function MapControls({ engine }: MapControlsProps) {
  return (
    <GlassPanel className="pointer-events-auto flex flex-col gap-0.5 p-1">
      <IconButton
        tone="onGlass" label={t.zoomIn} disabled={!engine}
        onClick={() => engine?.zoomIn()}
      >
        +
      </IconButton>
      <IconButton
        tone="onGlass" label={t.zoomOut} disabled={!engine}
        onClick={() => engine?.zoomOut()}
      >
        −
      </IconButton>
      <IconButton
        tone="onGlass" label={t.resetView} disabled={!engine}
        onClick={() => engine?.resetView()}
      >
        ⌂
      </IconButton>
    </GlassPanel>
  );
}
