import { RadioGroup as RadioPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { cx } from '../utils/cx';

export interface RadioOption {
  value: string;
  label: ReactNode;
}

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  /** Accessible name of the group. */
  label: string;
  className?: string;
}

export function RadioGroup({ value, onValueChange, options, label, className }: RadioGroupProps) {
  return (
    <RadioPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      aria-label={label}
      className={cx('flex flex-col gap-2', className)}
    >
      {options.map((option) => (
        <label key={option.value} className="flex cursor-pointer items-start gap-2 text-sm">
          <RadioPrimitive.Item
            value={option.value}
            className="focus-ring mt-0.5 grid size-5 shrink-0 place-items-center rounded-pill border border-border-input bg-surface data-[state=checked]:border-primary"
          >
            <RadioPrimitive.Indicator className="size-2.5 rounded-pill bg-primary" />
          </RadioPrimitive.Item>
          <span>{option.label}</span>
        </label>
      ))}
    </RadioPrimitive.Root>
  );
}
