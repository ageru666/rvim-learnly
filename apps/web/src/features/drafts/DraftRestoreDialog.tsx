import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Dialog } from '../../shared/components/Dialog';
import { useFormat } from '../locale/useFormat';
import { useT } from '../locale/useT';

interface DraftRestoreDialogProps {
  savedAt: string | null;
  conflict: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

/** "Restore draft" or "Discard" when a newer local draft exists (FR-TEACH-4). */
export function DraftRestoreDialog({ savedAt, conflict, onRestore, onDiscard }: DraftRestoreDialogProps) {
  const { t } = useT();
  const format = useFormat();
  return (
    <Dialog
      open={savedAt !== null}
      onOpenChange={(open) => {
        if (!open) onDiscard();
      }}
      title={t('app.teach.draft.title')}
      closeLabel={t('common.actions.close')}
    >
      <p>{t('app.teach.draft.text', { date: savedAt ? format.date(savedAt, 'dateTime') : '' })}</p>
      {conflict && <Alert kind="warning">{t('app.teach.draft.conflict')}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDiscard}>
          {t('app.teach.draft.discard')}
        </Button>
        <Button variant="primary" onClick={onRestore}>
          {t('app.teach.draft.restore')}
        </Button>
      </div>
    </Dialog>
  );
}
