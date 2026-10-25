import type { InstructorReview } from '@learnly/contracts/reviews';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { TeachReviewsPage } from '../TeachReviewsPage';
import { coursesOf } from '../utils';

const COURSE_A = { id: '01970000-0000-7000-8000-00000000c001', title: 'Основи JavaScript' };
const COURSE_B = { id: '01970000-0000-7000-8000-00000000c002', title: 'SQL для аналітиків' };

function review(index: number, course: { id: string; title: string }, overrides: Partial<InstructorReview> = {}): InstructorReview {
  return {
    id: `01970000-0000-7000-8000-0000000a${String(index).padStart(4, '0')}`,
    user: { id: `01970000-0000-7000-8000-0000000b${String(index).padStart(4, '0')}`, name: `Студент ${index}`, avatarUrl: null },
    rating: 4,
    text: `Корисний курс номер ${index}.`,
    hidden: false,
    authorReply: null,
    authorRepliedAt: null,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    course,
    ...overrides,
  };
}

describe('coursesOf', () => {
  it('lists each course once in the order of appearance', () => {
    expect(coursesOf([review(1, COURSE_A), review(2, COURSE_B), review(3, COURSE_A)])).toEqual([COURSE_A, COURSE_B]);
  });
});

describe('TeachReviewsPage', () => {
  it('filters by course, marks hidden reviews and replies in a dialog', async () => {
    document.cookie = 'locale=uk; path=/';
    const reviews = [review(1, COURSE_A), review(2, COURSE_B, { hidden: true })];
    let replied: unknown = null;
    server.use(
      http.get(`${config.apiBaseUrl}/instructor/reviews`, ({ request }) => {
        const courseId = new URL(request.url).searchParams.get('courseId');
        const items = courseId ? reviews.filter((item) => item.course.id === courseId) : reviews;
        return HttpResponse.json({ items, page: 1, limit: 20, total: items.length });
      }),
      http.put(`${config.apiBaseUrl}/reviews/:id/reply`, async ({ request, params }) => {
        replied = { id: params.id, body: await request.json() };
        const updated = { ...reviews[0], authorReply: 'Дякую!' };
        return HttpResponse.json(updated);
      }),
    );
    renderWithStore(<TeachReviewsPage />);

    expect(await screen.findByText('Корисний курс номер 1.')).toBeInTheDocument();
    expect(screen.getByText('Приховано модератором')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Відповісти' })[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog', { name: 'Відповідь на відгук' });
    await userEvent.type(within(dialog).getByLabelText('Текст відповіді'), 'Дякую!');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Надіслати' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(replied).toEqual({ id: reviews[0]?.id, body: { text: 'Дякую!' } });

    await userEvent.click(screen.getByRole('combobox', { name: 'Курс' }));
    await userEvent.click(await screen.findByRole('option', { name: 'SQL для аналітиків' }));
    await waitFor(() => expect(screen.queryByText('Корисний курс номер 1.')).not.toBeInTheDocument());
    expect(screen.getByText('Корисний курс номер 2.')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    document.cookie = 'locale=uk; path=/';
    server.use(
      http.get(`${config.apiBaseUrl}/instructor/reviews`, () => HttpResponse.json({ items: [], page: 1, limit: 20, total: 0 })),
    );
    renderWithStore(<TeachReviewsPage />);
    expect(await screen.findByText('На ваші курси ще немає відгуків.')).toBeInTheDocument();
  });
});
