import type { Locale } from '@learnly/contracts/enums';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Skeleton } from '../../shared/components/Skeleton';
import { describeError } from '../../shared/utils/describeError';
import { useT } from '../locale/useT';
import { AttemptHistory } from './components/AttemptHistory';
import { QuizNavigator } from './components/QuizNavigator';
import { QuizQuestion } from './components/QuizQuestion';
import { QuizResult } from './components/QuizResult';
import { QuizStart } from './components/QuizStart';
import { SubmitConfirmDialog } from './components/SubmitConfirmDialog';
import { useGetQuizQuery, useSubmitAttemptMutation } from './quizzesApi';
import {
  answerToggled,
  confirmToggled,
  questionChanged,
  quizStarted,
  selectQuizSession,
  selectUnanswered,
} from './quizSlice';
import { applyOrder } from './utils';

interface QuizLessonProps {
  quizId: string;
  courseId: string;
  /** The course content language for the question texts. */
  language: Locale;
  onCourseCompleted?: () => void;
}

/** A quiz lesson in the player: start screen, questions one by one, confirmation and the result. */
export function QuizLesson({ quizId, courseId, language, onCourseCompleted }: QuizLessonProps) {
  const i18n = useT();
  const { t } = i18n;
  const dispatch = useDispatch();
  const { data: quiz, error: loadError } = useGetQuizQuery(quizId);
  const session = useSelector(selectQuizSession(quizId));
  const unanswered = useSelector(selectUnanswered(quizId), shallowEqual);
  const [submit, { data: result, originalArgs, isLoading, error: submitError, reset }] = useSubmitAttemptMutation();

  if (loadError) return <Alert kind="error">{describeError(loadError, i18n)}</Alert>;
  if (!quiz) return <Skeleton className="h-48" />;

  const start = () => dispatch(quizStarted({ quizId, order: quiz.questions.map((question) => question.id) }));

  if (result && originalArgs) {
    return (
      <QuizResult
        result={result}
        questions={applyOrder(quiz.questions, result.questions.map((question) => question.id))}
        answers={originalArgs.answers}
        language={language}
        onRetry={
          result.attemptsLeft === 0
            ? undefined
            : () => {
                reset();
                start();
              }
        }
      />
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-6">
        <QuizStart quiz={quiz} onStart={start} />
        <AttemptHistory quizId={quizId} />
      </div>
    );
  }

  const questions = applyOrder(quiz.questions, session.order);
  const current = questions[session.currentIndex];
  const goTo = (index: number) => dispatch(questionChanged({ quizId, index }));
  const send = () =>
    void submit({ quizId, courseId, answers: session.answers }).then((outcome) => {
      if (outcome.data?.progress.courseCompleted) onCourseCompleted?.();
    });
  const isLast = session.currentIndex === questions.length - 1;

  return (
    <Card className="card-body flex flex-col gap-6">
      <QuizNavigator order={session.order} answers={session.answers} currentIndex={session.currentIndex} onSelect={goTo} />
      {current && (
        <QuizQuestion
          question={current}
          index={session.currentIndex}
          total={questions.length}
          selected={session.answers[current.id] ?? []}
          language={language}
          onToggle={(optionId) => dispatch(answerToggled({ quizId, questionId: current.id, optionId, type: current.type }))}
        />
      )}
      {submitError && <Alert kind="error">{describeError(submitError, i18n)}</Alert>}
      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" disabled={session.currentIndex === 0} onClick={() => goTo(session.currentIndex - 1)}>
          <ArrowLeft aria-hidden size={16} />
          {t('app.quiz.previous')}
        </Button>
        {isLast ? (
          <Button
            variant="primary"
            loading={isLoading}
            onClick={() => (unanswered.length > 0 ? dispatch(confirmToggled({ quizId, open: true })) : send())}
          >
            {t('app.quiz.finish')}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => goTo(session.currentIndex + 1)}>
            {t('app.quiz.next')}
            <ArrowRight aria-hidden size={16} />
          </Button>
        )}
      </div>
      <SubmitConfirmDialog
        open={session.confirmOpen}
        unansweredCount={unanswered.length}
        onOpenChange={(open) => dispatch(confirmToggled({ quizId, open }))}
        onConfirm={send}
      />
    </Card>
  );
}
