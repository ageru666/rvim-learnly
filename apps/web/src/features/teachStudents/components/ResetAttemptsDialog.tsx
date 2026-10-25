import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useT } from '../../locale/useT';
import { useResetAttemptsMutation } from '../teachStudentsApi';
import { resetRequested, selectResetTarget } from '../teachStudentsSlice';

export function ResetAttemptsDialog({ courseId }: { courseId: string }) {
  const { t } = useT();
  const dispatch = useDispatch();
  const target = useSelector(selectResetTarget);
  const [resetAttempts] = useResetAttemptsMutation();
  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) dispatch(resetRequested(null));
      }}
      title={t('app.students.resetTitle', { name: target?.name ?? '', title: target?.title ?? '' })}
      description={t('app.students.resetText')}
      confirmLabel={t('app.students.reset')}
      cancelLabel={t('common.actions.cancel')}
      onConfirm={() => {
        if (target) void resetAttempts({ courseId, userId: target.userId, quizId: target.quizId });
      }}
    />
  );
}
