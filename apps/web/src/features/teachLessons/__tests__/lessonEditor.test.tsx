import type { LessonEditor } from '@learnly/contracts/instructor';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithDataRouter } from '../../../shared/test/renderWithStore';
import { LessonEditorPage } from '../LessonEditorPage';

const LESSON_ID = '01970000-0000-7000-8000-00000000b001';
const COURSE_ID = '01970000-0000-7000-8000-00000000c001';
const DRAFT_KEY = `learnly:v1:draft:lesson:${LESSON_ID}`;
const AUTOSAVE_WAIT_MS = 7000;

const LESSON: LessonEditor = {
  id: LESSON_ID,
  moduleId: '01970000-0000-7000-8000-00000000a001',
  courseId: COURSE_ID,
  title: 'Змінні',
  type: 'text',
  content: 'Текст',
  videoUrl: null,
  durationMinutes: 5,
  isPreview: false,
  updatedAt: '2026-10-20T10:00:00.000Z',
  quiz: null,
  typeLocked: false,
  editable: true,
};

/** A data router, because the unsaved-changes blocker needs one. */
function renderEditor(lesson: LessonEditor = LESSON) {
  document.cookie = 'locale=uk; path=/';
  server.use(http.get(`${config.apiBaseUrl}/instructor/lessons/${LESSON_ID}`, () => HttpResponse.json(lesson)));
  return renderWithDataRouter(
    [
      { path: '/teach/lessons/:id', element: <LessonEditorPage /> },
      { path: '/teach/courses/:id', element: <p>Course page</p> },
    ],
    `/teach/lessons/${LESSON_ID}`,
  ).router;
}

function storeDraft(fields: object, savedAt: string, baseUpdatedAt = LESSON.updatedAt) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ fields, savedAt, baseUpdatedAt }));
}

const FORM = { title: 'Змінні', type: 'text', durationMinutes: 5, isPreview: false, content: 'Текст', videoUrl: '', quiz: null };

describe('LessonEditorPage', () => {
  it(
    'autosaves a draft on this device 5 seconds after a change',
    async () => {
      renderEditor();
      const title = await screen.findByLabelText('Назва');
      await userEvent.clear(title);
      await userEvent.type(title, 'Змінні та константи');
      expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();

      await waitFor(() => expect(window.localStorage.getItem(DRAFT_KEY)).not.toBeNull(), { timeout: AUTOSAVE_WAIT_MS });
      expect(JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '{}')).toMatchObject({
        fields: { title: 'Змінні та константи' },
        baseUpdatedAt: LESSON.updatedAt,
      });
      expect(screen.getByRole('status')).toHaveTextContent('Чернетку збережено на цьому пристрої');
    },
    AUTOSAVE_WAIT_MS + 3000,
  );

  it('offers to restore a newer draft and warns about a conflict', async () => {
    storeDraft({ ...FORM, title: 'З чернетки' }, '2026-10-21T10:00:00.000Z', '2026-10-19T10:00:00.000Z');
    renderEditor();

    const dialog = await screen.findByRole('dialog', { name: 'Знайдено незбережену чернетку' });
    expect(dialog).toHaveTextContent('Увага: після створення чернетки курс або урок змінили в іншому місці.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Відновити чернетку' }));

    expect(screen.getByLabelText('Назва')).toHaveValue('З чернетки');
    expect(screen.getByRole('button', { name: 'Зберегти урок' })).toBeEnabled();
  });

  it('discards a draft', async () => {
    storeDraft({ ...FORM, title: 'З чернетки' }, '2026-10-21T10:00:00.000Z');
    renderEditor();
    const dialog = await screen.findByRole('dialog', { name: 'Знайдено незбережену чернетку' });
    expect(dialog).not.toHaveTextContent('Увага');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Відкинути' }));
    await waitFor(() => expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull());
    expect(screen.getByLabelText('Назва')).toHaveValue('Змінні');
  });

  it('ignores a draft older than the saved lesson', async () => {
    storeDraft({ ...FORM, title: 'Старе' }, '2026-10-19T10:00:00.000Z');
    renderEditor();
    expect(await screen.findByLabelText('Назва')).toHaveValue('Змінні');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks before leaving with unsaved changes', async () => {
    const router = renderEditor();
    await userEvent.type(await screen.findByLabelText('Назва'), '!');
    await userEvent.click(screen.getByRole('link', { name: 'До курсу' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Є незбережені зміни' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Залишитися' }));
    expect(router.state.location.pathname).toBe(`/teach/lessons/${LESSON_ID}`);

    await userEvent.click(screen.getByRole('link', { name: 'До курсу' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Піти' }));
    expect(await screen.findByText('Course page')).toBeInTheDocument();
  });

  it('saves the lesson and the quiz, checking the quiz first', async () => {
    const quizLesson: LessonEditor = { ...LESSON, type: 'quiz', content: null, quiz: { passScore: 70, maxAttempts: null, shuffle: false, revealAnswers: 'always', questions: [] } };
    let quizBody: Record<string, unknown> | undefined;
    server.use(
      http.patch(`${config.apiBaseUrl}/instructor/lessons/${LESSON_ID}`, () => HttpResponse.json({ ...quizLesson, updatedAt: '2026-10-22T10:00:00.000Z' })),
      http.put(`${config.apiBaseUrl}/instructor/lessons/${LESSON_ID}/quiz`, async ({ request }) => {
        quizBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(quizBody);
      }),
    );
    renderEditor(quizLesson);

    await userEvent.type(await screen.findByLabelText('Назва'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти урок' }));
    expect(await screen.findByText('у тесті немає питань')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Питання з однією відповіддю' }));
    await userEvent.type(screen.getByLabelText('Текст питання'), 'Що виведе console.log(1)?');
    await userEvent.type(screen.getByLabelText('Варіант 1'), '1');
    await userEvent.type(screen.getByLabelText('Варіант 2'), 'undefined');
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти урок' }));

    await waitFor(() => expect(quizBody).toMatchObject({ questions: [{ type: 'single', text: 'Що виведе console.log(1)?' }] }));
    expect(await screen.findByText('Урок збережено.')).toBeInTheDocument();
  });
});
