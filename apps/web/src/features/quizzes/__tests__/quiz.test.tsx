import type { QuizForStudent } from '@learnly/contracts/quizzes';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { QuizLesson } from '../QuizLesson';

const QUIZ_ID = '01970000-0000-7000-8000-00000000d001';
const COURSE_ID = '01970000-0000-7000-8000-00000000c001';
const LESSON_ID = '01970000-0000-7000-8000-00000000b003';
const Q = ['01970000-0000-7000-8000-0000000e0001', '01970000-0000-7000-8000-0000000e0002', '01970000-0000-7000-8000-0000000e0003'];
const opt = (question: number, option: number) => `01970000-0000-7000-8000-0000000f0${question}0${option}`;
const STORAGE_KEY = `learnly:v1:quiz:${QUIZ_ID}`;

const QUIZ: QuizForStudent = {
  id: QUIZ_ID,
  lessonId: LESSON_ID,
  passScore: 70,
  maxAttempts: 3,
  attemptsUsed: 0,
  bestScore: null,
  passed: false,
  shuffle: false,
  canSubmit: true,
  questions: [
    { id: Q[0] ?? '', type: 'single', text: 'Скільки буде 2 + 2?', points: 1, options: [{ id: opt(1, 1), text: 'Чотири' }, { id: opt(1, 2), text: 'П’ять' }] },
    { id: Q[1] ?? '', type: 'multiple', text: 'Оберіть парні числа', points: 2, options: [{ id: opt(2, 1), text: 'Два' }, { id: opt(2, 2), text: 'Три' }] },
    { id: Q[2] ?? '', type: 'single', text: 'Столиця України?', points: 1, options: [{ id: opt(3, 1), text: 'Київ' }, { id: opt(3, 2), text: 'Львів' }] },
  ],
};

function renderQuiz() {
  document.cookie = 'locale=uk; path=/';
  server.use(
    http.get(`${config.apiBaseUrl}/learn/quizzes/${QUIZ_ID}`, () => HttpResponse.json(QUIZ)),
    http.get(`${config.apiBaseUrl}/learn/quizzes/${QUIZ_ID}/attempts`, () => HttpResponse.json([])),
  );
  return renderWithStore(<QuizLesson quizId={QUIZ_ID} courseId={COURSE_ID} language="uk" />);
}

describe('QuizLesson', () => {
  it('restores an unfinished attempt after a reload', async () => {
    const first = renderQuiz();
    await userEvent.click(await screen.findByRole('button', { name: 'Почати тест' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Чотири' }));
    await userEvent.click(screen.getByRole('button', { name: 'Наступне питання' }));
    expect(screen.getByText('Питання 2 з 3')).toBeInTheDocument();
    first.unmount();

    renderQuiz();
    expect(await screen.findByText('Питання 2 з 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Питання 1: є відповідь' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Питання 1: є відповідь' }));
    expect(screen.getByRole('radio', { name: 'Чотири' })).toBeChecked();
  });

  it('asks before submitting with unanswered questions, then shows a result without revealed answers', async () => {
    let body: unknown;
    server.use(
      http.post(`${config.apiBaseUrl}/learn/quizzes/${QUIZ_ID}/attempts`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            id: '01970000-0000-7000-8000-0000000a0001',
            scorePercent: 25,
            scorePoints: 1,
            maxPoints: 4,
            passed: false,
            attemptsLeft: 2,
            answersRevealed: false,
            questions: [
              { id: Q[0], correct: true, explanation: '2 + 2 = 4.', correctOptionIds: null },
              { id: Q[1], correct: false, explanation: null, correctOptionIds: null },
              { id: Q[2], correct: false, explanation: null, correctOptionIds: null },
            ],
            progress: { progress: 0, completedLessonIds: [], courseCompleted: false, certificateCode: null },
          },
          { status: 201 },
        );
      }),
    );
    renderQuiz();
    await userEvent.click(await screen.findByRole('button', { name: 'Почати тест' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Чотири' }));
    await userEvent.click(screen.getByRole('button', { name: 'Питання 3: без відповіді' }));
    await userEvent.click(screen.getByRole('button', { name: 'Завершити тест' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Завершити тест?' });
    expect(dialog).toHaveTextContent('2 питання залишилися без відповіді.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Завершити' }));

    expect(await screen.findByText('Тест не складено')).toBeInTheDocument();
    expect(body).toEqual({ answers: { [Q[0] ?? '']: [opt(1, 1)] } });
    expect(screen.getByText('Результат: 25% (1 з 4)')).toBeInTheDocument();
    expect(screen.getByText('2 + 2 = 4.')).toBeInTheDocument();
    expect(screen.queryByText('Правильна відповідь')).not.toBeInTheDocument();
    expect(screen.getByText(/Правильні відповіді зʼявляться/)).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull());

    await userEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }));
    expect(await screen.findByText('Питання 1 з 3')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Чотири' })).not.toBeChecked();
  });

  it('shows correct answers when the result reveals them', async () => {
    server.use(
      http.post(`${config.apiBaseUrl}/learn/quizzes/${QUIZ_ID}/attempts`, () =>
        HttpResponse.json(
          {
            id: '01970000-0000-7000-8000-0000000a0002',
            scorePercent: 100,
            scorePoints: 4,
            maxPoints: 4,
            passed: true,
            attemptsLeft: 2,
            answersRevealed: true,
            questions: [
              { id: Q[0], correct: true, explanation: null, correctOptionIds: [opt(1, 1)] },
              { id: Q[1], correct: true, explanation: null, correctOptionIds: [opt(2, 1)] },
              { id: Q[2], correct: true, explanation: null, correctOptionIds: [opt(3, 1)] },
            ],
            progress: { progress: 100, completedLessonIds: [LESSON_ID], courseCompleted: false, certificateCode: null },
          },
          { status: 201 },
        ),
      ),
    );
    renderQuiz();
    await userEvent.click(await screen.findByRole('button', { name: 'Почати тест' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Чотири' }));
    await userEvent.click(screen.getByRole('button', { name: 'Наступне питання' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Два' }));
    await userEvent.click(screen.getByRole('button', { name: 'Наступне питання' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Київ' }));
    await userEvent.click(screen.getByRole('button', { name: 'Завершити тест' }));

    expect(await screen.findByText('Тест складено')).toBeInTheDocument();
    expect(screen.getAllByText('Правильна відповідь')).toHaveLength(3);
  });

  it('explains why a quiz without attempts cannot be started', async () => {
    document.cookie = 'locale=uk; path=/';
    server.use(
      http.get(`${config.apiBaseUrl}/learn/quizzes/${QUIZ_ID}`, () =>
        HttpResponse.json({ ...QUIZ, attemptsUsed: 3, bestScore: 40, canSubmit: false }),
      ),
      http.get(`${config.apiBaseUrl}/learn/quizzes/${QUIZ_ID}/attempts`, () =>
        HttpResponse.json([{ id: '01970000-0000-7000-8000-0000000a0003', scorePercent: 40, passed: false, submittedAt: '2026-10-20T10:00:00.000Z' }]),
      ),
    );
    renderWithStore(<QuizLesson quizId={QUIZ_ID} courseId={COURSE_ID} language="uk" />);
    expect(await screen.findByText('Спроби вичерпано. Автор курсу може надати вам нові спроби.')).toBeInTheDocument();
    expect(screen.getByText('Залишилося 0 спроб')).toBeInTheDocument();
    expect(await screen.findByText('Тест не складено')).toBeInTheDocument();
  });
});
