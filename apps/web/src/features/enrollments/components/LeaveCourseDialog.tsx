import { useDispatch, useSelector } from 'react-redux';
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
  const [leaveCourse, { isLoading, error, reset }] = useLeaveCourseMutation();

  return (
    <ConfirmDialog
      open={leaving !== null}
      onOpenChange={(open) => {
        if (open) return;
        dispatch(leaveRequested(null));
        reset();
      }}
      title={t('app.myCourses.leaveTitle', { title: leaving?.title ?? '' })}
      description={t('app.myCourses.leaveText')}
      confirmLabel={t('app.myCourses.leaveConfirm')}
      cancelLabel={t('common.actions.cancel')}
      pending={isLoading}
      error={error ? describeError(error, i18n) : null}
      onConfirm={() => {
        if (leaving) void leaveCourse(leaving.courseId);
      }}
    />
  );
}
