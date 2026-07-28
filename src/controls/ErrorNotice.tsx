import { GlassPanel } from '../ui/GlassPanel';
import { t } from '../i18n/tr';

export interface ErrorNoticeProps {
  kind: 'tile' | 'webgl';
  onDismiss(): void;
}

export function ErrorNotice({ kind, onDismiss }: ErrorNoticeProps) {
  return (
    <GlassPanel
      role="status"
      className="pointer-events-auto flex items-center gap-3 px-4 py-2.5"
    >
      <p className="text-xs text-ink-500">
        {kind === 'tile' ? t.tileError : t.webglError}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t.dismiss}
        className="rounded-lg px-2 py-1 text-xs font-medium text-brand-700
                   transition-transform duration-200 ease-[var(--ease-spring)]
                   hover:bg-brand-100 active:scale-95
                   focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        {t.dismiss}
      </button>
    </GlassPanel>
  );
}
