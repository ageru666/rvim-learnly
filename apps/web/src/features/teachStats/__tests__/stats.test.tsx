import type { CourseStats } from '@learnly/contracts/instructor';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { StatsPage } from '../StatsPage';
import { biggestDrop, funnelSeries, ratingSeries, toPercent, weeklySeries } from '../utils';

const COURSE_ID = '01970000-0000-7000-8000-00000000c001';
const lesson = (index: number) => `01970000-0000-7000-8000-00000000b00${index}`;

const STATS: CourseStats = {
  totals: { students: 10, completed: 2, avgProgress: 55, ratingAvg: 4.2 },
  enrollmentsByWeek: Array.from({ length: 12 }, (_, index) => ({ weekStart: `2026-08-${String(index + 3).padStart(2, '0')}`, count: index })),
  funnel: [
    { lessonId: lesson(1), title: 'Вступ', completedShare: 0.9 },
    { lessonId: lesson(2), title: 'Змінні', completedShare: 0.4 },
    { lessonId: lesson(3), title: 'Функції', completedShare: 0.3 },
  ],
  quizzes: [
    { quizId: '01970000-0000-7000-8000-00000000d001', title: 'Тест 1', avgScore: 72, firstTryPassShare: 0.6 },
    { quizId: '01970000-0000-7000-8000-00000000d002', title: 'Тест 2', avgScore: null, firstTryPassShare: null },
  ],
  ratingDistribution: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 1 },
};

describe('stats utils', () => {
  it('prepares series', () => {
    expect(toPercent(0.456)).toBe(46);
    expect(weeklySeries(STATS.enrollmentsByWeek.slice(0, 1), (date) => `d:${date}`)).toEqual([{ weekStart: '2026-08-03', label: 'd:2026-08-03', count: 0 }]);
    expect(funnelSeries(STATS.funnel).map((step) => step.percent)).toEqual([90, 40, 30]);
    expect(ratingSeries(STATS.ratingDistribution)).toEqual([
      { stars: 5, count: 1, percent: 25 },
      { stars: 4, count: 2, percent: 50 },
      { stars: 3, count: 0, percent: 0 },
      { stars: 2, count: 1, percent: 25 },
      { stars: 1, count: 0, percent: 0 },
    ]);
    expect(ratingSeries({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }).every((row) => row.percent === 0)).toBe(true);
  });

  it('finds the largest drop, counting all students before the first lesson', () => {
    expect(biggestDrop(STATS.funnel)).toEqual({ lessonId: lesson(2), title: 'Змінні', drop: 0.5 });
    expect(biggestDrop([{ lessonId: lesson(1), title: 'A', completedShare: 0.2 }])?.title).toBe('A');
    expect(biggestDrop([{ lessonId: lesson(1), title: 'A', completedShare: 1 }])).toBeNull();
    expect(biggestDrop([])).toBeNull();
  });
});

function renderStats(locale: 'uk' | 'en') {
  document.cookie = `locale=${locale}; path=/`;
  server.use(http.get(`${config.apiBaseUrl}/instructor/courses/${COURSE_ID}/stats`, () => HttpResponse.json(STATS)));
  return renderWithStore(
    <Routes>
      <Route path="/teach/courses/:id/stats" element={<StatsPage />} />
    </Routes>,
    { route: `/teach/courses/${COURSE_ID}/stats` },
  );
}

describe('StatsPage', () => {
  it('names the largest drop and shows numbers in Ukrainian', async () => {
    renderStats('uk');
    expect(await screen.findByText('Найбільше студентів зупиняється перед уроком «Змінні» (−50%).')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
    expect(screen.getByText('4,2')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '60%' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Немає даних' })).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Записи на курс за тиждень (12 тижнів)' })).toBeInTheDocument();
  });

  it('renders the same data in English', async () => {
    renderStats('en');
    expect(await screen.findByText('Most students stop before “Змінні” (−50%).')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('Rating distribution')).toBeInTheDocument();
    expect(screen.getByText('Week of Aug 3, 2026')).toBeInTheDocument();
  });
});
