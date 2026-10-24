import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { MyCoursesPage } from '../MyCoursesPage';
import { myCourse } from '../../../shared/test/learningFixtures';

function page(items: unknown[]) {
  return { items, page: 1, limit: 100, total: items.length };
}

describe('MyCoursesPage', () => {
  it('shows active and completed courses in tabs and searches by title', async () => {
    document.cookie = 'locale=uk; path=/';
    const active = [myCourse({ title: 'Основи JavaScript' }), myCourse({ title: 'SQL для аналітиків' })];
    const completed = [myCourse({ title: 'Git щодня', status: 'completed', progress: 100, completedAt: '2026-10-10T10:00:00.000Z' })];
    server.use(
      http.get(`${config.apiBaseUrl}/me/enrollments`, ({ request }) =>
        HttpResponse.json(page(new URL(request.url).searchParams.get('status') === 'completed' ? completed : active)),
      ),
    );
    renderWithStore(<MyCoursesPage />);

    expect(await screen.findByText('Основи JavaScript')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Пошук за назвою' }), 'sql');
    expect(screen.queryByText('Основи JavaScript')).not.toBeInTheDocument();
    expect(screen.getByText('SQL для аналітиків')).toBeInTheDocument();

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Пошук за назвою' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Завершені' }));
    expect(await screen.findByText('Git щодня')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Покинути курс' })).not.toBeInTheDocument();
  });

  it('leaves a course after confirmation', async () => {
    document.cookie = 'locale=uk; path=/';
    const course = myCourse({ title: 'Основи JavaScript' });
    let left = false;
    server.use(
      http.get(`${config.apiBaseUrl}/me/enrollments`, () => HttpResponse.json(page(left ? [] : [course]))),
      http.delete(`${config.apiBaseUrl}/courses/${course.course.id}/enrollment`, () => {
        left = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithStore(<MyCoursesPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Покинути курс' }));
    expect(screen.getByRole('alertdialog', { name: 'Покинути курс «Основи JavaScript»?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Покинути' }));

    expect(await screen.findByText('Активних курсів немає.')).toBeInTheDocument();
    await waitFor(() => expect(left).toBe(true));
  });
});
