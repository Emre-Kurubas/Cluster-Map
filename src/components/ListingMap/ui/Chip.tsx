import { t } from '../i18n/tr';

interface ChipProps {
  label: string;
  active?: boolean;
  swatchClass?: string;
  onClick?: () => void;
  onRemove?: () => void;
}

export function Chip({ label, active, swatchClass, onClick, onRemove }: ChipProps) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ' +
    'transition-[transform,background-color,color] duration-200 ease-[var(--ease-spring)] ' +
    'will-change-transform active:scale-95 focus-visible:outline-2 ' +
    'focus-visible:outline-offset-2 focus-visible:outline-brand-500';

  const tone = active
    ? 'bg-brand-700 text-white'
    : 'bg-white/70 text-ink-500 hover:bg-white';

  const content = (
    <>
      {swatchClass && <span className={`size-2 rounded-full ${swatchClass}`} />}
      {label}
    </>
  );

  if (onRemove) {
    return (
      <span className={`${base} ${tone}`}>
        {content}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${label} — ${t.removeFilter}`}
          className="ml-0.5 grid size-4 place-items-center rounded-full
                     opacity-70 hover:opacity-100 hover:bg-black/10"
        >
          ×
        </button>
      </span>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active ?? false}
        className={`${base} ${tone}`}
      >
        {content}
      </button>
    );
  }

  return <span className={`${base} ${tone}`}>{content}</span>;
}
