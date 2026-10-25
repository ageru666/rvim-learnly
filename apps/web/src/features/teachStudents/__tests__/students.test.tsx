import type { StudentRow } from '@learnly/contracts/instructor';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { StudentsPage } from '../StudentsPage';
import { csvHref } from '../utils';

const COURSE_ID = '01970000-0000-7000-8000-00000000c001';
const QUIZ_ID = '01970000-0000-7000-8000-00000000d001';

function student(index: number, name: string, attempts: number): StudentRow {
  return {
    userId: `01970000-0000-7000-8000-0000000a000${index}`,
    name,
    avatarUrl: null,
    enrolledAt: '2026-10-01T10:00:00.000Z',
    progress: 50,
    lastActivityAt: '2026-10-20T10:00:00.000Z',
    status: 'active',
    quizzes: [{ quizId: QUIZ_ID, title: 'Підсумковий тест', bestScore: attempts ? 40 : null, attempts, passed: false }],
  };
}

describe('csvHref', () => {
  it('keeps the filter and the interface language', () => {
    expect(csvHref('http://x/api/v1', 'c1', { search: ' анна ', sort: 'name', locale: 'en' })).toBe(
      'http://x/api/v1/instructor/courses/c1/students.csv?sort=name&lang=en&search=%D0%B0%D0%BD%D0%BD%D0%B0',
    );
    expect(csvHref('http://x/api/v1', 'c1', { search: '', sort: 'progress', locale: 'uk' })).toBe(
      'http://x/api/v1/instructor/courses/c1/students.csv?sort=progress&lang=uk',
    );
  });
});

describe('StudentsPage', () => {
  it('lists students, searches on the server and resets quiz attempts after confirmation', async () => {
    document.cookie = 'locale=uk; path=/';
    const searches: string[] = [];
    let reset: string | null = null;
    server.use(
      http.get(`${config.apiBaseUrl}/instructor/courses/${COURSE_ID}/students`, ({ request }) => {
        const search = new URL(request.url).searchParams.get('search') ?? '';
        searches.push(search);
        const rows = [student(1, 'Анна', 2), student(2, 'Богдан', 0)].filter((row) => row.name.toLowerCase().includes(search.toLowerCase()));
        return HttpResponse.json({ items: rows, page: 1, limit: 30, total: rows.length });
      }),
      http.delete(`${config.apiBaseUrl}/instructor/courses/${COURSE_ID}/students/:userId/attempts/:quizId`, ({ params }) => {
        reset = `${String(params.userId)}:${String(params.quizId)}`;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithStore(
      <Routes>
        <Route path="/teach/courses/:id/students" element={<StudentsPage />} />
      </Routes>,
      { route: `/teach/courses/${COURSE_ID}/students` },
    );

    expect(await screen.findByText('Анна')).toBeInTheDocument();
    expect(screen.getByText('Підсумковий тест: 40% (2 спроби)')).toBeInTheDocument();
    expect(screen.getByText('Підсумковий тест: без спроб')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Завантажити CSV' })).toHaveAttribute(
      'href',
      `${config.apiBaseUrl}/instructor/courses/${COURSE_ID}/students.csv?sort=lastActivity&lang=uk`,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Скинути спроби' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Скинути спроби Анна для тесту «Підсумковий тест»?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Скинути спроби' }));
    await waitFor(() => expect(reset).toBe(`${student(1, 'Анна', 2).userId}:${QUIZ_ID}`));

    await userEvent.type(screen.getByRole('searchbox', { name: 'Пошук за імʼям' }), 'бог');
    await waitFor(() => expect(screen.queryByText('Анна')).not.toBeInTheDocument());
    expect(searches).toContain('бог');
  });
});
