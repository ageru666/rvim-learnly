import type { Blocker } from 'react-router';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { useT } from '../locale/useT';

/** Asks before an in-app navigation leaves an editor with unsaved changes. */
export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  const { t } = useT();
  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset();
      }}
      title={t('app.teach.unsaved.title')}
      description={t('app.teach.unsaved.text')}
      confirmLabel={t('app.teach.unsaved.leave')}
      cancelLabel={t('app.teach.unsaved.stay')}
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
}
