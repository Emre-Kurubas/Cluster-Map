import { IconButton } from '../ui/IconButton';
import { t } from '../i18n/tr';
import type { MapEngine } from '../types/map';

export function MapControls({ engine }: { engine: MapEngine | null }) {
  return (
    <div className="pointer-events-auto flex flex-col gap-1.5">
      <IconButton label={t.zoomIn} disabled={!engine} onClick={() => engine?.zoomIn()}>
        +
      </IconButton>
      <IconButton label={t.zoomOut} disabled={!engine} onClick={() => engine?.zoomOut()}>
        −
      </IconButton>
      <IconButton label={t.resetView} disabled={!engine} onClick={() => engine?.resetView()}>
        ⌂
      </IconButton>
    </div>
  );
}
