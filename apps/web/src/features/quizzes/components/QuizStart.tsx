import type { QuizForStudent } from '@learnly/contracts/quizzes';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';

interface QuizStartProps {
  quiz: QuizForStudent;
  onStart: () => void;
}

/** FR-QUIZ-3: what the quiz is and how many attempts are left, before the first question. */
export function QuizStart({ quiz, onStart }: QuizStartProps) {
  const { t } = useT();
  const format = useFormat();
  const attemptsLeft = quiz.maxAttempts === null ? null : quiz.maxAttempts - quiz.attemptsUsed;

  return (
    <Card className="card-body flex flex-col gap-4">
      <ul className="flex flex-col gap-1 text-sm">
        <li>{t('app.quiz.questions', { count: quiz.questions.length })}</li>
        <li>{t('app.quiz.passScore', { value: format.percent(quiz.passScore) })}</li>
        <li>
          {attemptsLeft === null ? t('app.quiz.unlimitedAttempts') : t('app.quiz.attemptsLeft', { count: attemptsLeft })}
        </li>
        {quiz.bestScore !== null && <li>{t('app.quiz.bestScore', { value: format.percent(quiz.bestScore) })}</li>}
      </ul>
      {quiz.canSubmit ? (
        <Button variant="primary" className="self-start" onClick={onStart}>
          {t('app.quiz.start')}
        </Button>
      ) : (
        <Alert kind="info">{attemptsLeft === 0 ? t('app.quiz.noAttempts') : t('app.quiz.previewOnly')}</Alert>
      )}
    </Card>
  );
}
