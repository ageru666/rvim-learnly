import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { Alert } from './Alert';
import { buttonClass } from './buttonClass';
import { OVERLAY_CLASS } from './overlayClass';
import { Spinner } from './Spinner';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  /**
   * For an action that calls the server: the dialog stays open while it runs (the confirm button is busy)
   * and shows `error` if it fails; the caller closes the dialog when the action succeeds.
   */
  pending?: boolean;
  error?: string | null;
}

/** Confirmation for destructive or irreversible actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = true,
  pending,
  error,
}: ConfirmDialogProps) {
  const awaitsResult = pending !== undefined;
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={OVERLAY_CLASS} />
        <AlertDialogPrimitive.Content className="card fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 p-6 shadow-xl">
          <AlertDialogPrimitive.Title className="heading-md">{title}</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="text-sm text-text-muted">{description}</AlertDialogPrimitive.Description>
          {error && <Alert kind="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel className={buttonClass('outline')}>{cancelLabel}</AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              className={buttonClass(destructive ? 'danger' : 'primary')}
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={(event) => {
                if (awaitsResult) event.preventDefault();
                onConfirm();
              }}
            >
              {pending && <Spinner size={16} />}
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
