import { Check } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  id?: string;
}

export function Checkbox({ checked, onCheckedChange, label, disabled, id }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="focus-ring mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm border border-border-input bg-surface data-[state=checked]:border-primary data-[state=checked]:bg-primary"
      >
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden size={14} className="text-on-primary" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span>{label}</span>
    </label>
  );
}
