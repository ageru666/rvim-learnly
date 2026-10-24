import { X } from 'lucide-react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { cx } from '../utils/cx';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ToastKind;
  title: string;
  closeLabel: string;
}

export function Toast({ open, onOpenChange, kind, title, closeLabel }: ToastProps) {
  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      type={kind === 'error' ? 'foreground' : 'background'}
      className={cx('alert shadow-lg', kind === 'error' ? 'alert-error' : kind === 'success' ? 'alert-success' : 'alert-info')}
    >
      <ToastPrimitive.Title className="flex-1 font-medium">{title}</ToastPrimitive.Title>
      <ToastPrimitive.Close className="btn btn-ghost btn-icon -my-2" aria-label={closeLabel}>
        <X aria-hidden size={16} />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}
