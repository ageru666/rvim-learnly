import { Progress as ProgressPrimitive } from 'radix-ui';

interface ProgressBarProps {
  /** 0–100. */
  value: number;
  /** Visible or accessible text, e.g. "40% completed". */
  label: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, label, showLabel = false }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-3">
      <ProgressPrimitive.Root
        value={value}
        aria-label={label}
        className="relative h-2 flex-1 overflow-hidden rounded-pill bg-surface-sunken"
      >
        <ProgressPrimitive.Indicator
          className="h-full rounded-pill bg-primary transition-transform"
          style={{ transform: `translateX(-${100 - value}%)` }}
        />
      </ProgressPrimitive.Root>
      {showLabel && <span className="text-xs font-medium text-text-muted">{label}</span>}
    </div>
  );
}
