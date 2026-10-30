import type { QuestionType } from '@learnly/contracts/enums';
import type { Answers } from '@learnly/contracts/quizzes';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import { quizzesApi } from './quizzesApi';
import { toggleAnswer, unansweredIndexes } from './utils';

/** The `quiz:<quizId>` storage value (contracts/client-storage-and-external.md). */
export const storedAttemptSchema = z.object({
  answers: z.record(z.string(), z.array(z.string())),
  currentIndex: z.number().int().nonnegative(),
  order: z.array(z.string()),
  savedAt: z.string(),
});
export type StoredAttempt = z.infer<typeof storedAttemptSchema>;

/** An unfinished attempt (FR-QUIZ-4). */
interface QuizSession {
  answers: Answers;
  currentIndex: number;
  /** Question ids in the order the student sees them. */
  order: string[];
  confirmOpen: boolean;
}

interface QuizState {
  sessions: Record<string, QuizSession>;
}

const initialState: QuizState = { sessions: {} };

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    quizStarted: (state, action: PayloadAction<{ quizId: string; order: string[] }>) => {
      state.sessions[action.payload.quizId] = { answers: {}, currentIndex: 0, order: action.payload.order, confirmOpen: false };
    },
    /** A stored attempt found on start; its order and answers are already checked against the quiz. */
    quizRestored: (state, action: PayloadAction<{ quizId: string; stored: Omit<StoredAttempt, 'savedAt'> }>) => {
      const { stored } = action.payload;
      const currentIndex = Math.min(stored.currentIndex, Math.max(0, stored.order.length - 1));
      state.sessions[action.payload.quizId] = { ...stored, currentIndex, confirmOpen: false };
    },
    answerToggled: (
      state,
      action: PayloadAction<{ quizId: string; questionId: string; optionId: string; type: QuestionType }>,
    ) => {
      const session = state.sessions[action.payload.quizId];
      if (!session) return;
      const { questionId, optionId, type } = action.payload;
      session.answers[questionId] = toggleAnswer(session.answers[questionId] ?? [], optionId, type);
    },
    questionChanged: (state, action: PayloadAction<{ quizId: string; index: number }>) => {
      const session = state.sessions[action.payload.quizId];
      if (session) session.currentIndex = action.payload.index;
    },
    confirmToggled: (state, action: PayloadAction<{ quizId: string; open: boolean }>) => {
      const session = state.sessions[action.payload.quizId];
      if (session) session.confirmOpen = action.payload.open;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(quizzesApi.endpoints.submitAttempt.matchFulfilled, (state, action) => {
      delete state.sessions[action.meta.arg.originalArgs.quizId];
    });
  },
});

export const quizReducer = quizSlice.reducer;
export const { quizStarted, quizRestored, answerToggled, questionChanged, confirmToggled } = quizSlice.actions;

export const selectQuizSession =
  (quizId: string) =>
  (state: { quiz: QuizState }): QuizSession | null =>
    state.quiz.sessions[quizId] ?? null;

const NONE: number[] = [];

/** Unanswered positions; computed on demand by the submit flow, so no memoization is needed. */
export const selectUnanswered =
  (quizId: string) =>
  (state: { quiz: QuizState }): number[] => {
    const session = state.quiz.sessions[quizId];
    return session ? unansweredIndexes(session.order, session.answers) : NONE;
  };
