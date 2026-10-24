import { useDispatch, useSelector } from 'react-redux';
import { Alert } from '../../../shared/components/Alert';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { useLeaveCourseMutation } from '../enrollmentsApi';
import { leaveRequested, selectLeavingCourse } from '../enrollmentsSlice';

/** FR-LEARN-1: leaving deletes the enrollment and progress, so it is confirmed first. */
export function LeaveCourseDialog() {
  const i18n = useT();
  const { t } = i18n;
  const dispatch = useDispatch();
  const leaving = useSelector(selectLeavingCourse);
  const [leaveCourse, { error }] = useLeaveCourseMutation();

  return (
    <>
      {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
      <ConfirmDialog
      open={leaving !== null}
      onOpenChange={(open) => {
        if (!open) dispatch(leaveRequested(null));
      }}
      title={t('app.myCourses.leaveTitle', { title: leaving?.title ?? '' })}
      description={t('app.myCourses.leaveText')}
      confirmLabel={t('app.myCourses.leaveConfirm')}
      cancelLabel={t('common.actions.cancel')}
      onConfirm={() => {
        if (leaving) void leaveCourse(leaving.courseId);
      }}
      />
    </>
  );
}
