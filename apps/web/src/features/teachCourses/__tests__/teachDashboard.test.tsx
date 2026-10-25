import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { TeachDashboardPage } from '../TeachDashboardPage';

const CATEGORY_ID = '01970000-0000-7000-8000-00000000e001';
const NEW_ID = '01970000-0000-7000-8000-00000000c009';
const ROW = {
  id: '01970000-0000-7000-8000-00000000c001',
  slug: 'js',
  title: 'Основи JavaScript',
  status: 'published',
  coverUrl: null,
  lessonCount: 3,
  studentCount: 12,
  ratingAvg: 4.5,
  updatedAt: '2026-10-20T10:00:00.000Z',
};
const OVERVIEW = { byStatus: { draft: 1, pending_review: 0, published: 1, archived: 0 }, students: 12, ratingAvg: 4.5, enrollments30d: 4 };

describe('TeachDashboardPage', () => {
  it('shows the summary and own courses, filtered by status', async () => {
    document.cookie = 'locale=uk; path=/';
    server.use(
      http.get(`${config.apiBaseUrl}/instructor/overview`, () => HttpResponse.json(OVERVIEW)),
      http.get(`${config.apiBaseUrl}/instructor/courses`, ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        return HttpResponse.json(status === 'archived' ? [] : [ROW]);
      }),
    );
    renderWithStore(<TeachDashboardPage />);

    expect(await screen.findByText('Основи JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Опубліковано', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Записів за 30 днів')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('combobox', { name: 'Статус' }));
    await userEvent.click(await screen.findByRole('option', { name: 'В архіві' }));
    expect(await screen.findByText('Немає курсів із таким статусом.')).toBeInTheDocument();
  });

  it('creates a course and opens its editor', async () => {
    document.cookie = 'locale=uk; path=/';
    let body: unknown;
    server.use(
      http.get(`${config.apiBaseUrl}/instructor/overview`, () => HttpResponse.json({ ...OVERVIEW, byStatus: { draft: 0, pending_review: 0, published: 0, archived: 0 } })),
      http.get(`${config.apiBaseUrl}/instructor/courses`, () => HttpResponse.json([])),
      http.get(`${config.apiBaseUrl}/categories`, () =>
        HttpResponse.json([{ id: CATEGORY_ID, name: 'Програмування', slug: 'programming', accent: 'blue', courseCount: 1 }]),
      ),
      http.post(`${config.apiBaseUrl}/instructor/courses`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: NEW_ID,
            slug: 'osnovy-typescript',
            title: 'Основи TypeScript',
            shortDescription: null,
            description: null,
            coverUrl: null,
            level: 'beginner',
            language: 'uk',
            categoryId: CATEGORY_ID,
            tags: [],
            outcomes: [],
            requirements: [],
            status: 'draft',
            moderationComment: null,
            editable: true,
            updatedAt: '2026-10-25T10:00:00.000Z',
            modules: [],
          },
          { status: 201 },
        );
      }),
    );
    renderWithStore(
      <Routes>
        <Route path="/teach" element={<TeachDashboardPage />} />
        <Route path="/teach/courses/:id" element={<p>Editor opened</p>} />
      </Routes>,
      { route: '/teach' },
    );

    expect(await screen.findByText('У вас ще немає курсів. Створіть перший!')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Створити курс' }));
    const dialog = await screen.findByRole('dialog', { name: 'Новий курс' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Створити й відкрити редактор' }));
    expect(await within(dialog).findAllByText(/.+/, { selector: '.field-error' })).not.toHaveLength(0);

    await userEvent.type(within(dialog).getByLabelText('Назва курсу'), 'Основи TypeScript');
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Категорія' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Програмування' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Створити й відкрити редактор' }));

    await waitFor(() => expect(body).toEqual({ title: 'Основи TypeScript', categoryId: CATEGORY_ID, level: 'beginner', language: 'uk' }));
    expect(await screen.findByText('Editor opened')).toBeInTheDocument();
  });
});
