import { COURSE_LEVELS, LOCALES } from '@learnly/contracts/enums';
import { updateCourseSchema, type CourseEditor } from '@learnly/contracts/instructor';
import { LIMITS } from '@learnly/contracts/limits';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { isApiError } from '../../../shared/api/apiError';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { FormField } from '../../../shared/components/FormField';
import { Input } from '../../../shared/components/Input';
import { MarkdownEditor } from '../../../shared/components/MarkdownEditor';
import { Select } from '../../../shared/components/Select';
import { Textarea } from '../../../shared/components/Textarea';
import { describeError } from '../../../shared/utils/describeError';
import { zodResolver } from '../../../shared/utils/zodResolver';
import { DraftRestoreDialog } from '../../drafts/DraftRestoreDialog';
import { useDraft } from '../../drafts/useDraft';
import { useFormat } from '../../locale/useFormat';
import { useMarkdownLabels } from '../../locale/useMarkdownLabels';
import { useT } from '../../locale/useT';
import { useGetCategoriesQuery, useUpdateCourseMutation } from '../teachCoursesApi';
import { toCourseForm, toCourseUpdate, type CourseForm } from '../utils';
import { CoverUpload } from './CoverUpload';
import { ListInput } from './ListInput';
import { TagsInput } from './TagsInput';

/** Form shape: list items may be empty while typing (they are dropped on save). */
const courseFormSchema = updateCourseSchema.required().extend({
  categoryId: z.string(),
  outcomes: z.array(z.string().max(LIMITS.courseListItem.max)).max(LIMITS.courseListItems.max),
  requirements: z.array(z.string().max(LIMITS.courseListItem.max)).max(LIMITS.courseListItems.max),
}) satisfies z.ZodType<CourseForm>;

export function BasicTab({ course }: { course: CourseEditor }) {
  const i18n = useT();
  const { t, translate } = i18n;
  const format = useFormat();
  const markdownLabels = useMarkdownLabels();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [updateCourse, { isLoading, error, isSuccess }] = useUpdateCourseMutation();
  const form = useForm<CourseForm>({ resolver: zodResolver(courseFormSchema, i18n), defaultValues: toCourseForm(course) });
  const { register, control, handleSubmit, formState, reset } = form;
  const values = useWatch({ control }) as CourseForm;
  const draft = useDraft({
    key: `draft:course:${course.id}`,
    baseUpdatedAt: course.updatedAt,
    values,
    isDirty: formState.isDirty,
    schema: courseFormSchema,
  });
  const serverErrors = isApiError(error) ? Object.fromEntries(error.details.map((detail) => [detail.path, detail.message])) : {};
  const fieldError = (name: keyof CourseForm) => formState.errors[name]?.message ?? serverErrors[name];
  const disabled = !course.editable;

  const submit = handleSubmit(async (values) => {
    const result = await updateCourse({ id: course.id, input: toCourseUpdate(values, course) });
    if (result.data) {
      reset(toCourseForm(result.data));
      draft.clear();
    }
  });

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={(event) => void submit(event)}>
      <DraftRestoreDialog
        savedAt={draft.pending?.savedAt ?? null}
        conflict={draft.conflict}
        onRestore={() => {
          const fields = draft.restore();
          if (fields) reset(fields, { keepDefaultValues: true });
        }}
        onDiscard={draft.discard}
      />
      {isSuccess && !formState.isDirty && <Alert kind="success">{t('app.teach.basics.saved')}</Alert>}
      {error && Object.keys(serverErrors).length === 0 && <Alert kind="error">{describeError(error, i18n)}</Alert>}
      <fieldset disabled={disabled} className="flex flex-col gap-5">
        <FormField label={t('app.teach.basics.courseTitle')} error={fieldError('title')}>
          {(field) => <Input {...field} {...register('title')} lang={course.language} />}
        </FormField>
        <FormField label={t('app.teach.basics.slug')} hint={t('app.teach.basics.slugHint', { slug: values.slug })} error={fieldError('slug')}>
          {(field) => <Input {...field} {...register('slug')} />}
        </FormField>
        <FormField
          label={t('app.teach.basics.shortDescription')}
          hint={t('app.teach.basics.shortDescriptionHint')}
          error={fieldError('shortDescription')}
        >
          {(field) => (
            <Textarea {...field} {...register('shortDescription')} rows={2} maxLength={LIMITS.courseShortDescription.max} lang={course.language} />
          )}
        </FormField>
        <FormField label={t('app.teach.basics.description')} error={fieldError('description')}>
          {(field) => (
            <Controller
              control={control}
              name="description"
              render={({ field: { value, onChange } }) => (
                <MarkdownEditor {...field} value={value} onChange={onChange} labels={markdownLabels} lang={course.language} readOnly={disabled} />
              )}
            />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label={t('app.teach.basics.category')} error={fieldError('categoryId')}>
            {(field) => (
              <Controller
                control={control}
                name="categoryId"
                render={({ field: { value, onChange } }) => (
                  <Select
                    {...field}
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled}
                    options={categories.map((category) => ({ value: category.id, label: category.name }))}
                  />
                )}
              />
            )}
          </FormField>
          <FormField label={t('app.teach.basics.level')}>
            {(field) => (
              <Controller
                control={control}
                name="level"
                render={({ field: { value, onChange } }) => (
                  <Select
                    {...field}
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled}
                    options={COURSE_LEVELS.map((level) => ({ value: level, label: translate(`enums.courseLevel.${level}`) }))}
                  />
                )}
              />
            )}
          </FormField>
          <FormField label={t('app.teach.basics.language')}>
            {(field) => (
              <Controller
                control={control}
                name="language"
                render={({ field: { value, onChange } }) => (
                  <Select
                    {...field}
                    value={value}
                    onValueChange={onChange}
                    disabled={disabled}
                    options={LOCALES.map((language) => ({ value: language, label: translate(`enums.locale.${language}`) }))}
                  />
                )}
              />
            )}
          </FormField>
        </div>
        <Controller
          control={control}
          name="tags"
          render={({ field: { value, onChange } }) => <TagsInput value={value} onChange={onChange} disabled={disabled} />}
        />
        {(['outcomes', 'requirements'] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field: { value, onChange } }) => (
              <ListInput
                label={t(`app.teach.basics.${name}`)}
                value={value}
                onChange={onChange}
                max={LIMITS.courseListItems.max}
                maxLength={LIMITS.courseListItem.max}
                disabled={disabled}
              />
            )}
          />
        ))}
      </fieldset>
      <CoverUpload course={course} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={isLoading} disabled={disabled || !formState.isDirty}>
          {t('app.teach.basics.save')}
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
