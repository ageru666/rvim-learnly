import { COURSE_LEVELS, LOCALES } from '@learnly/contracts/enums';
import { createCourseSchema, type CreateCourseInput } from '@learnly/contracts/instructor';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Dialog } from '../../../shared/components/Dialog';
import { FormField } from '../../../shared/components/FormField';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { describeError } from '../../../shared/utils/describeError';
import { zodResolver } from '../../../shared/utils/zodResolver';
import { selectLocale } from '../../locale/localeSlice';
import { useT } from '../../locale/useT';
import { useCreateCourseMutation, useGetCategoriesQuery } from '../teachCoursesApi';
import { createDialogToggled, selectCreateDialogOpen } from '../teachCoursesSlice';

/** FR-TEACH-2: one step, then the editor opens. */
export function CreateCourseDialog() {
  const i18n = useT();
  const { t, translate } = i18n;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const open = useSelector(selectCreateDialogOpen);
  const locale = useSelector(selectLocale);
  const { data: categories = [] } = useGetCategoriesQuery(undefined, { skip: !open });
  const [createCourse, { isLoading, error }] = useCreateCourseMutation();
  const { register, control, handleSubmit, formState } = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema, i18n),
    defaultValues: { title: '', categoryId: '', level: 'beginner', language: locale },
  });

  const submit = handleSubmit(async (values) => {
    const result = await createCourse(values);
    if (result.data) void navigate(`/teach/courses/${result.data.id}`);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => dispatch(createDialogToggled(next))}
      title={t('app.teach.createDialog.title')}
      closeLabel={t('common.actions.close')}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void submit(event)}>
        {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
        <FormField label={t('app.teach.createDialog.courseTitle')} error={formState.errors.title?.message}>
          {(field) => <Input {...field} {...register('title')} />}
        </FormField>
        <FormField label={t('app.teach.createDialog.category')} error={formState.errors.categoryId?.message}>
          {(field) => (
            <Controller
              control={control}
              name="categoryId"
              render={({ field: { value, onChange } }) => (
                <Select
                  {...field}
                  value={value}
                  onValueChange={onChange}
                  placeholder={t('app.teach.createDialog.chooseCategory')}
                  options={categories.map((category) => ({ value: category.id, label: category.name }))}
                />
              )}
            />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('app.teach.createDialog.level')}>
            {(field) => (
              <Controller
                control={control}
                name="level"
                render={({ field: { value, onChange } }) => (
                  <Select
                    {...field}
                    value={value}
                    onValueChange={onChange}
                    options={COURSE_LEVELS.map((level) => ({ value: level, label: translate(`enums.courseLevel.${level}`) }))}
                  />
                )}
              />
            )}
          </FormField>
          <FormField label={t('app.teach.createDialog.language')}>
            {(field) => (
              <Controller
                control={control}
                name="language"
                render={({ field: { value, onChange } }) => (
                  <Select
                    {...field}
                    value={value}
                    onValueChange={onChange}
                    options={LOCALES.map((language) => ({ value: language, label: translate(`enums.locale.${language}`) }))}
                  />
                )}
              />
            )}
          </FormField>
        </div>
        <Button type="submit" variant="primary" className="self-end" loading={isLoading}>
          {t('app.teach.createDialog.submit')}
        </Button>
      </form>
    </Dialog>
  );
}
