import type { LessonEditor } from '@learnly/contracts/instructor';
import { useDraft, type DraftState } from '../drafts/useDraft';
import { lessonFormSchema, type LessonForm } from './utils';

/** The lesson editor draft (`draft:lesson:<lessonId>`), autosaved 5 s after a change. */
export function useLessonDraft(lesson: LessonEditor, values: LessonForm, isDirty: boolean): DraftState<LessonForm> {
  return useDraft({
    key: `draft:lesson:${lesson.id}`,
    baseUpdatedAt: lesson.updatedAt,
    values,
    isDirty,
    schema: lessonFormSchema,
  });
}
