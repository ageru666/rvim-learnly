import type { LearnCourse } from '@learnly/contracts/learning';
import { LIMITS } from '@learnly/contracts/limits';
import { Download } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { useFormat } from '../locale/useFormat';
import { useT } from '../locale/useT';
import { flattenCurriculum } from '../player/utils';
import { useDownloadMarkdownMutation, useGetCourseNotesQuery, useSaveNoteMutation } from './notesApi';
import { noteTyped, selectNoteDraft } from './notesSlice';
import { exportNotesMarkdown, notesFileName } from './utils';

const AUTOSAVE_DELAY_MS = 800;

interface NotesPanelProps {
  course: LearnCourse;
  lessonId: string;
}

/** FR-LEARN-6: one note per lesson, autosaved on this device, exported for the whole course. */
export function NotesPanel({ course, lessonId }: NotesPanelProps) {
  const { t } = useT();
  const format = useFormat();
  const dispatch = useDispatch();
  const courseId = course.course.id;
  const { data: notes, error } = useGetCourseNotesQuery(courseId);
  const [saveNote, { data: saved, error: saveError }] = useSaveNoteMutation();
  const [download] = useDownloadMarkdownMutation();
  const lessons = flattenCurriculum(course.modules);
  const lessonTitle = lessons.find((lesson) => lesson.id === lessonId)?.title ?? '';
  const stored = notes?.[lessonId]?.text ?? '';
  // The text being typed; the stored note is written 0.8 s after typing stops.
  const draft = useSelector(selectNoteDraft(courseId, lessonId));
  const text = draft ?? stored;

  useEffect(() => {
    if (draft === undefined || draft === stored) return undefined;
    const timer = window.setTimeout(() => void saveNote({ courseId, lessonId, text: draft }), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, stored, courseId, lessonId, saveNote]);

  const savedAt = saved?.[lessonId]?.updatedAt;
  const withNotes = lessons.filter((lesson) => notes?.[lesson.id]?.text.trim());

  function exportAll() {
    const markdown = exportNotesMarkdown({
      courseTitle: course.course.title,
      lessons,
      notes: notes ?? {},
      headings: {
        course: (title) => t('app.notes.exportHeading', { course: title }),
        lesson: (title) => t('app.notes.exportLesson', { lesson: title }),
        exportedOn: t('app.notes.exportDate', { date: format.date(new Date().toISOString(), 'long') }),
      },
    });
    void download({ fileName: notesFileName(course.course.title), markdown });
  }

  return (
    <section className="flex flex-col gap-4" aria-label={t('app.notes.title')}>
      {(error ?? saveError) && <Alert kind="warning">{t('app.notes.unavailable')}</Alert>}
      <div className="field">
        <label className="field-label" htmlFor={`note-${lessonId}`}>
          {t('app.notes.label', { lesson: lessonTitle })}
        </label>
        <textarea
          id={`note-${lessonId}`}
          className="input min-h-40"
          value={text}
          maxLength={LIMITS.noteText.max}
          aria-describedby={`note-${lessonId}-hint`}
          onChange={(event) => dispatch(noteTyped({ courseId, lessonId, text: event.target.value }))}
        />
        <p id={`note-${lessonId}-hint`} className="field-hint">
          {t('app.notes.hint')}
        </p>
        {savedAt && (
          <p className="text-xs text-text-muted" role="status">
            {t('app.notes.saved', { time: format.date(savedAt, 'time') })}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t('app.notes.courseNotes')}</h3>
        {withNotes.length === 0 ? (
          <p className="text-sm text-text-muted">{t('app.notes.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {withNotes.map((lesson) => (
              <li key={lesson.id} className="truncate">
                {lesson.title}
              </li>
            ))}
          </ul>
        )}
        <Button size="sm" variant="outline" className="self-start" disabled={withNotes.length === 0} onClick={exportAll}>
          <Download aria-hidden size={14} />
          {t('app.notes.export')}
        </Button>
      </div>
    </section>
  );
}
