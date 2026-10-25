import type { CourseEditor } from '@learnly/contracts/instructor';
import { Upload } from 'lucide-react';
import { useId } from 'react';
import { Alert } from '../../../shared/components/Alert';
import { buttonClass } from '../../../shared/components/buttonClass';
import { Spinner } from '../../../shared/components/Spinner';
import { cx } from '../../../shared/utils/cx';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { useUploadCoverMutation } from '../teachCoursesApi';

export function CoverUpload({ course }: { course: CourseEditor }) {
  const i18n = useT();
  const { t } = i18n;
  const id = useId();
  const [upload, { isLoading, error }] = useUploadCoverMutation();

  return (
    <div className="field">
      <span className="field-label">{t('app.teach.basics.cover')}</span>
      {course.coverUrl && (
        <img src={course.coverUrl} alt="" className="aspect-video w-full max-w-md rounded-md object-cover" width="640" height="360" />
      )}
      <label htmlFor={id} className={cx(buttonClass('outline', 'sm'), 'self-start')}>
        {isLoading ? <Spinner size={14} /> : <Upload aria-hidden size={14} />}
        {t('app.teach.basics.uploadCover')}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={!course.editable || isLoading}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload({ id: course.id, file });
          event.target.value = '';
        }}
      />
      <p id={`${id}-hint`} className="field-hint">
        {t('app.teach.basics.coverHint')}
      </p>
      {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
    </div>
  );
}
