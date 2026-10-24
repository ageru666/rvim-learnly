import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { OVERLAY_CLASS } from './overlayClass';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}

/** A dialog sliding in from the side, used for navigation on small screens. */
export function Drawer({ open, onOpenChange, title, closeLabel, children }: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY_CLASS} />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(22rem,90vw)] flex-col gap-4 overflow-y-auto border-r border-border bg-surface p-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="heading-md">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="btn btn-ghost btn-icon" aria-label={closeLabel}>
              <X aria-hidden size={18} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
