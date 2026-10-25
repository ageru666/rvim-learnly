import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { CourseCompletedPage } from '../CourseCompletedPage';
import { PlayerPage } from '../PlayerPage';
import { COURSE_ID, LESSON_1, LESSON_2, LESSON_3, learnCourse, lessonContent } from './fixtures';

/** The server answers after this delay, so the optimistic state can be checked before it. */
const SERVER_DELAY_MS = 300;
const BEFORE_RESPONSE = { timeout: SERVER_DELAY_MS / 2 };

interface LessonStub {
  title: string;
  prev: string | null;
  next: string | null;
}

const LESSONS: Record<string, LessonStub> = {
  [LESSON_1]: { title: 'Що таке JavaScript', prev: null, next: LESSON_2 },
  [LESSON_2]: { title: 'Змінні', prev: LESSON_1, next: LESSON_3 },
};

function renderPlayer(lessonId = LESSON_2, course = learnCourse()) {
  document.cookie = 'locale=uk; path=/';
  server.use(
    http.get(`${config.apiBaseUrl}/learn/courses/${COURSE_ID}`, () => HttpResponse.json(course)),
    http.get(`${config.apiBaseUrl}/learn/lessons/:lessonId`, ({ params }) => {
      const id = String(params.lessonId);
      const lesson = LESSONS[id];
      return HttpResponse.json(
        lessonContent({ id, title: lesson?.title ?? 'Тест', prevLessonId: lesson?.prev ?? null, nextLessonId: lesson?.next ?? null }),
      );
    }),
  );
  return renderWithStore(
    <Routes>
      <Route path="/learn/:courseId/:lessonId" element={<PlayerPage />} />
    </Routes>,
    { route: `/learn/${COURSE_ID}/${lessonId}` },
  );
}

function sidebar() {
  return within(screen.getAllByRole('navigation', { name: 'Програма курсу' })[0] as HTMLElement);
}

describe('PlayerPage', () => {
  it('shows the curriculum with completion marks and the current lesson', async () => {
    renderPlayer();
    expect(await screen.findByRole('heading', { level: 1, name: 'Змінні' })).toHaveAttribute('lang', 'uk');
    expect(sidebar().getAllByLabelText('Пройдено')).toHaveLength(1);
    expect(sidebar().getAllByLabelText('Не пройдено')).toHaveLength(2);
    expect(sidebar().getByRole('link', { current: 'page' })).toHaveTextContent('Змінні');
    expect(screen.getByRole('progressbar', { name: 'Прогрес курсу: 33%' })).toBeInTheDocument();
  });

  it('collapses a module and remembers it on the device', async () => {
    renderPlayer();
    const toggle = await screen.findByRole('button', { name: 'Показати або сховати уроки модуля «Перевірка»' });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse(window.localStorage.getItem('learnly:v1:ui') ?? '{}')).toMatchObject({
      collapsedModules: { [COURSE_ID]: [expect.any(String)] },
    });
  });

  it('navigates to the previous and next lessons', async () => {
    renderPlayer();
    await userEvent.click(await screen.findByRole('link', { name: 'Попередній урок' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Що таке JavaScript' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Попередній урок' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Наступний урок' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Змінні' })).toBeInTheDocument();
  });

  it('marks a lesson complete optimistically', async () => {
    server.use(
      http.put(`${config.apiBaseUrl}/learn/lessons/${LESSON_2}/completion`, async () => {
        await delay(SERVER_DELAY_MS);
        return HttpResponse.json({ progress: 66, completedLessonIds: [LESSON_1, LESSON_2], courseCompleted: false, certificateCode: null });
      }),
    );
    renderPlayer();
    await userEvent.click(await screen.findByRole('button', { name: 'Позначити як пройдений' }));

    await waitFor(() => expect(sidebar().getAllByLabelText('Пройдено')).toHaveLength(2), BEFORE_RESPONSE);
    expect(screen.getByRole('progressbar', { name: 'Прогрес курсу: 66%' })).toBeInTheDocument();
    const button = await screen.findByRole('button', { name: 'Скасувати позначку' });
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    expect(sidebar().getAllByLabelText('Пройдено')).toHaveLength(2);
  });

  it('rolls the mark back when the server refuses', async () => {
    server.use(
      http.put(`${config.apiBaseUrl}/learn/lessons/${LESSON_2}/completion`, async () => {
        await delay(SERVER_DELAY_MS);
        return HttpResponse.json({ error: { code: 'INTERNAL', message: 'Щось пішло не так. Спробуйте ще раз.' } }, { status: 500 });
      }),
    );
    renderPlayer();
    await userEvent.click(await screen.findByRole('button', { name: 'Позначити як пройдений' }));
    await waitFor(() => expect(sidebar().getAllByLabelText('Пройдено')).toHaveLength(2), BEFORE_RESPONSE);

    expect(await screen.findByRole('alert')).toHaveTextContent('Щось пішло не так. Спробуйте ще раз.');
    await waitFor(() => expect(sidebar().getAllByLabelText('Пройдено')).toHaveLength(1));
    expect(screen.getByRole('progressbar', { name: 'Прогрес курсу: 33%' })).toBeInTheDocument();
  });

  it('opens the curriculum in a drawer on small screens', async () => {
    renderPlayer();
    await userEvent.click(await screen.findByRole('button', { name: 'Відкрити програму курсу' }));
    const drawer = await screen.findByRole('dialog', { name: 'Програма курсу' });
    await userEvent.click(within(drawer).getByRole('link', { name: /Що таке JavaScript/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Що таке JavaScript' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the preview banner and no completion button for the author', async () => {
    renderPlayer(LESSON_2, learnCourse({ mode: 'preview', status: null, progress: 0 }));
    expect(await screen.findByText('Режим перегляду: так курс бачать студенти, прогрес не зберігається.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Позначити як пройдений' })).not.toBeInTheDocument();
  });
});

describe('course completion', () => {
  it('opens the congratulations screen when the last lesson completes the course', async () => {
    server.use(
      http.put(`${config.apiBaseUrl}/learn/lessons/${LESSON_2}/completion`, () =>
        HttpResponse.json({ progress: 100, completedLessonIds: [LESSON_1, LESSON_2, LESSON_3], courseCompleted: true, certificateCode: 'K7QW2M9XTR' }),
      ),
      http.get(`${config.apiBaseUrl}/me/certificates`, () => HttpResponse.json([])),
      http.get(`${config.apiBaseUrl}/me/dashboard`, () => HttpResponse.json({})),
      http.get(`${config.apiBaseUrl}/me/enrollments`, () => HttpResponse.json({})),
    );
    document.cookie = 'locale=uk; path=/';
    server.use(
      http.get(`${config.apiBaseUrl}/learn/courses/${COURSE_ID}`, () => HttpResponse.json(learnCourse())),
      http.get(`${config.apiBaseUrl}/learn/lessons/:lessonId`, () => HttpResponse.json(lessonContent())),
    );
    renderWithStore(
      <Routes>
        <Route path="/learn/:courseId/:lessonId" element={<PlayerPage />} />
        <Route path="/learn/:courseId/completed" element={<CourseCompletedPage />} />
      </Routes>,
      { route: `/learn/${COURSE_ID}/${LESSON_2}` },
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Позначити як пройдений' }));
    expect(await screen.findByRole('heading', { name: 'Курс завершено!' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Залишити відгук' })).toHaveAttribute('href', '/courses/js-basics#reviews');
  });
});
