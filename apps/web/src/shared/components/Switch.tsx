import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, label, disabled }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="focus-ring relative h-6 w-11 shrink-0 rounded-pill bg-border-strong data-[state=checked]:bg-primary"
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-pill bg-surface shadow transition-transform data-[state=checked]:translate-x-[22px]" />
      </SwitchPrimitive.Root>
      <span>{label}</span>
    </label>
  );
}
