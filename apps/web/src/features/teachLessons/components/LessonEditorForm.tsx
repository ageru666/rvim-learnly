import { LESSON_TYPES } from '@learnly/contracts/enums';
import type { LessonEditor } from '@learnly/contracts/instructor';
import { LIMITS } from '@learnly/contracts/limits';
import { ArrowLeft } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { buttonClass } from '../../../shared/components/buttonClass';
import { FormField } from '../../../shared/components/FormField';
import { Input } from '../../../shared/components/Input';
import { MarkdownEditor } from '../../../shared/components/MarkdownEditor';
import { Select } from '../../../shared/components/Select';
import { Switch } from '../../../shared/components/Switch';
import { cx } from '../../../shared/utils/cx';
import { describeError } from '../../../shared/utils/describeError';
import { zodResolver } from '../../../shared/utils/zodResolver';
import { DraftRestoreDialog } from '../../drafts/DraftRestoreDialog';
import { UnsavedChangesDialog } from '../../drafts/UnsavedChangesDialog';
import { useUnsavedChangesBlocker } from '../../drafts/useUnsavedChangesBlocker';
import { useFormat } from '../../locale/useFormat';
import { useMarkdownLabels } from '../../locale/useMarkdownLabels';
import { useT } from '../../locale/useT';
import { QuizEditor } from '../../teachQuizzes/QuizEditor';
import { validateQuizDraft } from '../../teachQuizzes/utils';
import { useSaveQuizMutation, useUpdateLessonMutation } from '../teachLessonsApi';
import { quizProblemsShown, selectQuizProblemsShown } from '../teachLessonsSlice';
import { useLessonDraft } from '../useLessonDraft';
import { lessonFormValidationSchema, quizFor, toLessonForm, toLessonUpdate, type LessonForm } from '../utils';
import { VideoLessonFields } from './VideoLessonFields';

/** The lesson fields, the quiz editor for quiz lessons, the draft and the unsaved-changes guard. */
export function LessonEditorForm({ lesson }: { lesson: LessonEditor }) {
  const i18n = useT();
  const { t, translate } = i18n;
  const format = useFormat();
  const dispatch = useDispatch();
  const markdownLabels = useMarkdownLabels();
  const showQuizProblems = useSelector(selectQuizProblemsShown);
  const [updateLesson, updateState] = useUpdateLessonMutation();
  const [saveQuiz, quizState] = useSaveQuizMutation();
  const { control, register, handleSubmit, formState, reset } = useForm<LessonForm>({
    resolver: zodResolver(lessonFormValidationSchema, i18n),
    defaultValues: toLessonForm(lesson),
  });
  const values = useWatch({ control }) as LessonForm;
  const draft = useLessonDraft(lesson, values, formState.isDirty);
  const saving = updateState.isLoading || quizState.isLoading;
  const blocker = useUnsavedChangesBlocker(formState.isDirty && !saving);
  const serverError = updateState.error ?? quizState.error;
  const disabled = !lesson.editable;
  const quiz = quizFor(values);

  const submit = handleSubmit(async (form) => {
    const quizToSave = quizFor(form);
    if (quizToSave && validateQuizDraft(quizToSave).length > 0) {
      dispatch(quizProblemsShown(true));
      return;
    }
    const updated = await updateLesson({ lessonId: lesson.id, courseId: lesson.courseId, input: toLessonUpdate(form) });
    if (!updated.data) return;
    const savedQuiz = quizToSave ? await saveQuiz({ lessonId: lesson.id, courseId: lesson.courseId, quiz: quizToSave }) : null;
    if (savedQuiz?.error) return;
    dispatch(quizProblemsShown(false));
    reset({ ...toLessonForm(updated.data), quiz: savedQuiz?.data ?? updated.data.quiz });
    draft.clear();
  });

  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={(event) => void submit(event)}>
      <DraftRestoreDialog
        savedAt={draft.pending?.savedAt ?? null}
        conflict={draft.conflict}
        onRestore={() => {
          const fields = draft.restore();
          if (fields) reset(fields, { keepDefaultValues: true });
        }}
        onDiscard={draft.discard}
      />
      <UnsavedChangesDialog blocker={blocker} />
      <Link to={`/teach/courses/${lesson.courseId}`} className={cx(buttonClass('ghost', 'sm'), 'self-start')}>
        <ArrowLeft aria-hidden size={16} />
        {t('app.lessonEditor.backToCourse')}
      </Link>
      <h1 className="heading-xl">{t('app.lessonEditor.title')}</h1>
      {disabled && <Alert kind="info">{t('app.lessonEditor.readOnly')}</Alert>}
      {updateState.isSuccess && !formState.isDirty && <Alert kind="success">{t('app.lessonEditor.saved')}</Alert>}
      {serverError && <Alert kind="error">{describeError(serverError, i18n)}</Alert>}

      <fieldset disabled={disabled} className="flex flex-col gap-5">
        <FormField label={t('app.lessonEditor.lessonTitle')} error={formState.errors.title?.message}>
          {(field) => <Input {...field} {...register('title')} />}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('app.lessonEditor.type')} hint={lesson.typeLocked ? t('app.lessonEditor.typeLocked') : undefined}>
            {(field) => (
              <Controller
                control={control}
                name="type"
                render={({ field: { value, onChange } }) => (
                  <Select
                    {...field}
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled || lesson.typeLocked}
                    options={LESSON_TYPES.map((type) => ({ value: type, label: translate(`enums.lessonType.${type}`) }))}
                  />
                )}
              />
            )}
          </FormField>
          <FormField label={t('app.lessonEditor.duration')} error={formState.errors.durationMinutes?.message}>
            {(field) => (
              <Input
                {...field}
                type="number"
                min={LIMITS.lessonDuration.min}
                max={LIMITS.lessonDuration.max}
                {...register('durationMinutes', { valueAsNumber: true })}
              />
            )}
          </FormField>
        </div>
        <Controller
          control={control}
          name="isPreview"
          render={({ field: { value, onChange } }) => (
            <Switch checked={value} onCheckedChange={onChange} label={t('app.lessonEditor.preview')} disabled={disabled} />
          )}
        />
        {values.type === 'video' && (
          <Controller
            control={control}
            name="videoUrl"
            render={({ field: { value, onChange } }) => (
              <VideoLessonFields value={value} onChange={onChange} error={formState.errors.videoUrl?.message} disabled={disabled} />
            )}
          />
        )}
        {values.type !== 'quiz' && (
          <FormField
            label={values.type === 'video' ? t('app.lessonEditor.description') : t('app.lessonEditor.content')}
            error={formState.errors.content?.message}
          >
            {(field) => (
              <Controller
                control={control}
                name="content"
                render={({ field: { value, onChange } }) => (
                  <MarkdownEditor {...field} value={value} onChange={onChange} labels={markdownLabels} readOnly={disabled} rows={16} />
                )}
              />
            )}
          </FormField>
        )}
      </fieldset>

      {quiz && (
        <Controller
          control={control}
          name="quiz"
          render={({ field: { onChange } }) => (
            <QuizEditor value={quiz} onChange={onChange} disabled={disabled} showProblems={showQuizProblems} />
          )}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={saving} disabled={disabled || !formState.isDirty}>
          {t('app.lessonEditor.save')}
        </Button>
        {draft.savedAt && (
          <span className="text-sm text-text-muted" role="status">
            {t('app.teach.draft.autosaved', { time: format.date(draft.savedAt, 'time') })}
          </span>
        )}
      </div>
    </form>
  );
}
