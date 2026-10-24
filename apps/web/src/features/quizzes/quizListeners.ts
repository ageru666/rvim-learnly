import { isAnyOf, type ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import { readStored, removeStored, writeStored } from '../../shared/api/browserStorage';
import { logFailure } from '../../shared/utils/logger';
import { quizzesApi } from './quizzesApi';
import {
  answerToggled,
  questionChanged,
  quizRestored,
  quizStarted,
  selectQuizSession,
  storedAttemptSchema,
  type StoredAttempt,
} from './quizSlice';
import { answersFor } from './utils';

type SessionState = Parameters<ReturnType<typeof selectQuizSession>>[0];

const storageKey = (quizId: string) => `quiz:${quizId}`;

function attempt(action: unknown): string | null {
  const payload = (action as { payload?: { quizId?: unknown } }).payload;
  return typeof payload?.quizId === 'string' ? payload.quizId : null;
}

function readAttempt(quizId: string): StoredAttempt | null {
  try {
    return readStored(storageKey(quizId), storedAttemptSchema);
  } catch (error) {
    logFailure('restore quiz attempt', { quizId, error: String(error) });
    return null;
  }
}

/** FR-QUIZ-4: an unfinished attempt survives a reload and is removed once it is submitted. */
export function startQuizListeners(listeners: ListenerMiddlewareInstance): void {
  listeners.startListening({
    matcher: quizzesApi.endpoints.getQuiz.matchFulfilled,
    effect: (action, api) => {
      const quiz = action.payload;
      if (selectQuizSession(quiz.id)(api.getState() as SessionState)) return;
      const stored = readAttempt(quiz.id);
      const questionIds = quiz.questions.map((question) => question.id);
      const sameQuestions =
        stored?.order.length === questionIds.length && stored.order.every((id) => questionIds.includes(id));
      if (!stored || !sameQuestions) return;
      api.dispatch(
        quizRestored({
          quizId: quiz.id,
          stored: { order: stored.order, currentIndex: stored.currentIndex, answers: answersFor(questionIds, stored.answers) },
        }),
      );
    },
  });

  listeners.startListening({
    matcher: isAnyOf(quizStarted, answerToggled, questionChanged),
    effect: (action, api) => {
      const quizId = attempt(action);
      const session = quizId ? selectQuizSession(quizId)(api.getState() as SessionState) : null;
      if (!quizId || !session) return;
      try {
        const value: StoredAttempt = {
          answers: session.answers,
          currentIndex: session.currentIndex,
          order: session.order,
          savedAt: new Date().toISOString(),
        };
        writeStored(storageKey(quizId), value);
      } catch (error) {
        logFailure('save quiz attempt', { quizId, error: String(error) });
      }
    },
  });

  listeners.startListening({
    matcher: quizzesApi.endpoints.submitAttempt.matchFulfilled,
    effect: (action) => {
      try {
        removeStored(storageKey(action.meta.arg.originalArgs.quizId));
      } catch (error) {
        logFailure('clear quiz attempt', { error: String(error) });
      }
    },
  });
}
