import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { courseCard, myCourse } from '../../../shared/test/learningFixtures';
import { DashboardPage } from '../DashboardPage';

const ME = {
  id: '01970000-0000-7000-8000-000000000001',
  name: 'Олена',
  avatarUrl: null,
  email: 'olena@learnly.local',
  emailVerified: true,
  role: 'student',
  locale: 'uk',
  bio: null,
  links: {},
};

function renderDashboard(dashboard: () => Response | Promise<Response>) {
  document.cookie = 'locale=uk; path=/';
  server.use(
    http.get(`${config.apiBaseUrl}/me`, () => HttpResponse.json(ME)),
    http.get(`${config.apiBaseUrl}/me/dashboard`, dashboard),
  );
  return renderWithStore(<DashboardPage />);
}

describe('DashboardPage', () => {
  it('shows a skeleton while loading', async () => {
    renderDashboard(async () => {
      await delay('infinite');
      return HttpResponse.json({});
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Вітаємо, Олена!' })).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('invites a new student to the catalog', async () => {
    renderDashboard(() => HttpResponse.json({ continue: null, active: [], certificates: [], recommendations: [] }));
    expect(await screen.findByText('Ви ще не записані на жоден курс.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Перейти до каталогу' })).toHaveAttribute('href', '/courses');
  });

  it('offers a retry for a transient failure', async () => {
    let calls = 0;
    renderDashboard(() => {
      calls += 1;
      return calls === 1
        ? HttpResponse.json({ error: { code: 'INTERNAL', message: 'Щось пішло не так. Спробуйте ще раз.' } }, { status: 500 })
        : HttpResponse.json({ continue: null, active: [], certificates: [], recommendations: [] });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Щось пішло не так. Спробуйте ще раз.');
    await userEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }));
    expect(await screen.findByText('Ви ще не записані на жоден курс.')).toBeInTheDocument();
  });

  it('shows continue learning, active courses and recommendations', async () => {
    const active = myCourse({ title: 'Основи JavaScript' });
    const recommended = courseCard({ title: 'SQL для аналітиків', slug: 'sql' });
    renderDashboard(() =>
      HttpResponse.json({
        continue: {
          courseId: active.course.id,
          courseTitle: 'Основи JavaScript',
          lessonId: active.lastLessonId,
          lessonTitle: 'Змінні',
          progress: 40,
        },
        active: [active],
        certificates: [],
        recommendations: [recommended],
      }),
    );
    expect(await screen.findByText('Урок «Змінні»')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Продовжити/ })).toHaveAttribute(
      'href',
      `/learn/${active.course.id}/${active.lastLessonId ?? ''}`,
    );
    expect(screen.getByRole('progressbar', { name: 'Прогрес: 40%' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SQL для аналітиків/ })).toHaveAttribute('href', '/courses/sql');
  });
});
