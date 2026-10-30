import { lessonTypeSchema } from '@learnly/contracts/enums';
import type { FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Dialog } from '../../../shared/components/Dialog';
import { FormField } from '../../../shared/components/FormField';
import { Input } from '../../../shared/components/Input';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { dialogOpened, selectCurriculumDialog } from '../curriculumSlice';
import { LessonTypeField } from './LessonTypeField';
import {
  useCreateLessonMutation,
  useCreateModuleMutation,
  useDeleteLessonMutation,
  useDeleteModuleMutation,
  useRenameModuleMutation,
} from '../teachCurriculumApi';

function formText(event: FormEvent<HTMLFormElement>, name: string): string {
  const value = new FormData(event.currentTarget).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/** Add/rename module, add lesson and delete confirmations for one course. */
export function CurriculumDialogs({ courseId }: { courseId: string }) {
  const i18n = useT();
  const { t, translate } = i18n;
  const dispatch = useDispatch();
  const dialog = useSelector(selectCurriculumDialog);
  const [createModule, createModuleState] = useCreateModuleMutation();
  const [renameModule, renameState] = useRenameModuleMutation();
  const [createLesson, createLessonState] = useCreateLessonMutation();
  const [deleteModule, deleteModuleState] = useDeleteModuleMutation();
  const [deleteLesson, deleteLessonState] = useDeleteLessonMutation();
  const close = () => dispatch(dialogOpened(null));
  const deleteError = deleteModuleState.error ?? deleteLessonState.error;
  const error = createModuleState.error ?? renameState.error ?? createLessonState.error;

  const moduleDialog = dialog?.kind === 'addModule' || dialog?.kind === 'renameModule' ? dialog : null;
  const addLesson = dialog?.kind === 'addLesson' ? dialog : null;

  function submitModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = formText(event, 'title');
    if (moduleDialog?.kind === 'renameModule') void renameModule({ courseId, moduleId: moduleDialog.moduleId, title });
    else void createModule({ courseId, title });
  }

  function submitLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const type = lessonTypeSchema.catch('text').parse(new FormData(event.currentTarget).get('type'));
    if (addLesson) void createLesson({ courseId, moduleId: addLesson.moduleId, lesson: { title: formText(event, 'title'), type } });
  }

  return (
    <>
      <Dialog
        open={moduleDialog !== null}
        onOpenChange={(open) => !open && close()}
        title={moduleDialog?.kind === 'renameModule' ? t('app.curriculum.renameModule') : t('app.curriculum.addModule')}
        closeLabel={t('common.actions.close')}
      >
        <form className="flex flex-col gap-4" onSubmit={submitModule}>
          {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
          <FormField label={t('app.curriculum.moduleTitle')}>
            {(field) => (
              <Input {...field} name="title" required minLength={2} maxLength={120} defaultValue={moduleDialog?.kind === 'renameModule' ? moduleDialog.title : ''} />
            )}
          </FormField>
          <Button type="submit" variant="primary" className="self-end" loading={createModuleState.isLoading || renameState.isLoading}>
            {t('app.curriculum.save')}
          </Button>
        </form>
      </Dialog>

      <Dialog open={addLesson !== null} onOpenChange={(open) => !open && close()} title={t('app.curriculum.addLesson')} closeLabel={t('common.actions.close')}>
        <form className="flex flex-col gap-4" onSubmit={submitLesson}>
          {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
          <FormField label={t('app.curriculum.lessonTitle')}>
            {(field) => <Input {...field} name="title" required minLength={2} maxLength={120} />}
          </FormField>
          <LessonTypeField label={t('app.curriculum.lessonType')} labelFor={(type) => translate(`enums.lessonType.${type}`)} />
          <Button type="submit" variant="primary" className="self-end" loading={createLessonState.isLoading}>
            {t('app.curriculum.save')}
          </Button>
        </form>
      </Dialog>

      <ConfirmDialog
        open={dialog?.kind === 'deleteModule' || dialog?.kind === 'deleteLesson'}
        onOpenChange={(open) => {
          if (open) return;
          close();
          deleteModuleState.reset();
          deleteLessonState.reset();
        }}
        title={
          dialog?.kind === 'deleteModule'
            ? t('app.curriculum.deleteModuleTitle', { title: dialog.title })
            : t('app.curriculum.deleteLessonTitle', { title: dialog?.kind === 'deleteLesson' ? dialog.title : '' })
        }
        description={dialog?.kind === 'deleteModule' ? t('app.curriculum.deleteModuleText') : t('app.curriculum.deleteLessonText')}
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
        pending={deleteModuleState.isLoading || deleteLessonState.isLoading}
        error={deleteError ? describeError(deleteError, i18n) : null}
        onConfirm={() => {
          if (dialog?.kind === 'deleteModule') void deleteModule({ courseId, moduleId: dialog.moduleId });
          if (dialog?.kind === 'deleteLesson') void deleteLesson({ courseId, lessonId: dialog.lessonId });
        }}
      />
    </>
  );
}
