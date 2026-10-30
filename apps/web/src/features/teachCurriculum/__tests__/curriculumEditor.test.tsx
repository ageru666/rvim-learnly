import type { CourseEditor } from '@learnly/contracts/instructor';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { CurriculumEditor } from '../CurriculumEditor';

const COURSE_ID = '01970000-0000-7000-8000-00000000c001';
const M1 = '01970000-0000-7000-8000-00000000a001';
const M2 = '01970000-0000-7000-8000-00000000a002';
const [A, B, C] = ['01970000-0000-7000-8000-00000000b001', '01970000-0000-7000-8000-00000000b002', '01970000-0000-7000-8000-00000000b003'];

function lesson(id: string, title: string, position: number) {
  return { id, title, type: 'text' as const, durationMinutes: 5, isPreview: false, position };
}

const COURSE: CourseEditor = {
  id: COURSE_ID,
  slug: 'js',
  title: 'JavaScript',
  shortDescription: null,
  description: null,
  coverUrl: null,
  level: 'beginner',
  language: 'uk',
  categoryId: null,
  tags: [],
  outcomes: [],
  requirements: [],
  status: 'draft',
  moderationComment: null,
  editable: true,
  updatedAt: '2026-10-20T10:00:00.000Z',
  modules: [
    { id: M1, title: 'Вступ', position: 0, lessons: [lesson(A, 'Змінні', 0), lesson(B, 'Функції', 1)] },
    { id: M2, title: 'Практика', position: 1, lessons: [lesson(C, 'Задачі', 0)] },
  ],
};

function renderEditor(course = COURSE) {
  document.cookie = 'locale=uk; path=/';
  return renderWithStore(<CurriculumEditor course={course} />);
}

describe('CurriculumEditor', () => {
  it('moves a lesson to the next module and saves the new structure', async () => {
    let body: unknown;
    server.use(
      http.put(`${config.apiBaseUrl}/instructor/courses/${COURSE_ID}/structure`, async ({ request }) => {
        body = await request.json();
        await delay(100);
        return HttpResponse.json(COURSE.modules);
      }),
    );
    renderEditor();

    await userEvent.click(screen.getByRole('button', { name: 'Перемістити «Функції» нижче' }));

    const second = screen.getAllByRole('heading', { level: 3 })[1]?.closest('li') as HTMLElement;
    expect(within(second).getByText('Функції')).toBeInTheDocument();
    await waitFor(() =>
      expect(body).toEqual({ modules: [{ moduleId: M1, lessonIds: [A] }, { moduleId: M2, lessonIds: [B, C] }] }),
    );
  });

  it('adds a module through the dialog', async () => {
    let created: unknown;
    server.use(
      http.post(`${config.apiBaseUrl}/instructor/courses/${COURSE_ID}/modules`, async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({ id: '01970000-0000-7000-8000-00000000a003', title: 'Підсумок', position: 2, lessons: [] }, { status: 201 });
      }),
    );
    renderEditor();

    await userEvent.click(screen.getByRole('button', { name: 'Додати модуль' }));
    const dialog = await screen.findByRole('dialog', { name: 'Додати модуль' });
    await userEvent.type(within(dialog).getByLabelText('Назва модуля'), 'Підсумок');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Зберегти' }));

    await waitFor(() => expect(created).toEqual({ title: 'Підсумок' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the delete confirmation open and busy until the server answers, and shows its error', async () => {
    server.use(
      http.delete(`${config.apiBaseUrl}/instructor/lessons/${C}`, async () => {
        await delay(100);
        return HttpResponse.json({ error: { code: 'CONFLICT', message: 'Урок уже має спроби тестів.' } }, { status: 409 });
      }),
    );
    renderEditor();

    const [, , lastDelete] = screen.getAllByRole('button', { name: 'Видалити урок' });
    await userEvent.click(lastDelete as HTMLElement);
    const dialog = await screen.findByRole('alertdialog', { name: 'Видалити урок «Задачі»?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Видалити' }));

    expect(within(dialog).getByRole('button', { name: 'Видалити' })).toHaveAttribute('aria-busy', 'true');
    expect(await within(dialog).findByText('Урок уже має спроби тестів.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Видалити' })).not.toHaveAttribute('aria-busy');
  });

  it('is read-only while the course is in review', () => {
    renderEditor({ ...COURSE, status: 'pending_review', editable: false });
    expect(screen.queryByRole('button', { name: 'Додати модуль' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Перетягнути/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Редагувати урок' })).toHaveLength(3);
  });
});
