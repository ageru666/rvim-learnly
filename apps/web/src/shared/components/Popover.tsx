import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { cx } from '../utils/cx';

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  /** Positions the popover against an element that is not a trigger (e.g. a text selection). */
  anchor?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Popover({ open, onOpenChange, trigger, anchor, children, className }: PopoverProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>}
      {anchor && <PopoverPrimitive.Anchor asChild>{anchor}</PopoverPrimitive.Anchor>}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={8}
          collisionPadding={16}
          className={cx('card z-50 w-80 max-w-[calc(100vw-2rem)] p-4 shadow-lg', className)}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
