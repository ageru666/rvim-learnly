import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useT } from '../../locale/useT';

interface SubmitConfirmDialogProps {
  open: boolean;
  unansweredCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/** FR-QUIZ-3: asked only when some questions are left without an answer. */
export function SubmitConfirmDialog({ open, unansweredCount, onOpenChange, onConfirm }: SubmitConfirmDialogProps) {
  const { t } = useT();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('app.quiz.confirmTitle')}
      description={t('app.quiz.confirmText', { count: unansweredCount })}
      confirmLabel={t('app.quiz.confirmSubmit')}
      cancelLabel={t('app.quiz.backToQuestions')}
      onConfirm={onConfirm}
      destructive={false}
    />
  );
}
