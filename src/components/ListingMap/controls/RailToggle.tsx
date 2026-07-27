import { IconButton } from '../ui/IconButton';
import { useListingStore } from '../store/useListingStore';
import { t } from '../i18n/tr';

export function RailToggle() {
  const railOpen = useListingStore((state) => state.railOpen);
  const toggleRail = useListingStore((state) => state.toggleRail);

  return (
    <IconButton
      label={railOpen ? t.closeRail : t.openRail}
      onClick={toggleRail}
      className="pointer-events-auto"
    >
      {railOpen ? '‹' : '›'}
    </IconButton>
  );
}
