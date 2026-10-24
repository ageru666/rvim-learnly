import { DropdownMenu as MenuPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

interface DropdownMenuProps {
  /** The trigger element (a button with an accessible name). */
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
}

export function DropdownMenu({ trigger, children, align = 'end' }: DropdownMenuProps) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger asChild>{trigger}</MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-48 rounded-md border border-border bg-surface-raised p-1 shadow-lg"
        >
          {children}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
