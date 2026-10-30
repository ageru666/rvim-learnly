import { useDispatch, useSelector } from 'react-redux';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { useResetAttemptsMutation } from '../teachStudentsApi';
import { resetRequested, selectResetTarget } from '../teachStudentsSlice';

export function ResetAttemptsDialog({ courseId }: { courseId: string }) {
  const i18n = useT();
  const { t } = i18n;
  const dispatch = useDispatch();
  const target = useSelector(selectResetTarget);
  const [resetAttempts, { isLoading, error, reset }] = useResetAttemptsMutation();
  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (open) return;
        dispatch(resetRequested(null));
        reset();
      }}
      title={t('app.students.resetTitle', { name: target?.name ?? '', title: target?.title ?? '' })}
      description={t('app.students.resetText')}
      confirmLabel={t('app.students.reset')}
      cancelLabel={t('common.actions.cancel')}
      pending={isLoading}
      error={error ? describeError(error, i18n) : null}
      onConfirm={() => {
        if (target) void resetAttempts({ courseId, userId: target.userId, quizId: target.quizId });
      }}
    />
  );
}
