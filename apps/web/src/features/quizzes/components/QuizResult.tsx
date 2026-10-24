import type { Locale } from '@learnly/contracts/enums';
import type { Answers, AttemptResult, StudentQuestion } from '@learnly/contracts/quizzes';
import { CircleCheck, CircleX } from 'lucide-react';
import { Alert } from '../../../shared/components/Alert';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { MarkdownView } from '../../../shared/components/MarkdownView';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';

interface QuizResultProps {
  result: AttemptResult;
  questions: readonly StudentQuestion[];
  answers: Answers;
  language: Locale;
  onRetry?: () => void;
}

/** FR-QUIZ-6: score, status and a per-question review; correct options only when revealed. */
export function QuizResult({ result, questions, answers, language, onRetry }: QuizResultProps) {
  const { t } = useT();
  const format = useFormat();
  const byId = new Map(result.questions.map((question) => [question.id, question]));

  return (
    <div className="flex flex-col gap-4">
      <Card className="card-body flex flex-col gap-3">
        <Badge
          tone={result.passed ? 'success' : 'danger'}
          icon={result.passed ? <CircleCheck aria-hidden size={14} /> : <CircleX aria-hidden size={14} />}
        >
          {result.passed ? t('app.quiz.passed') : t('app.quiz.failed')}
        </Badge>
        <p className="heading-md">
          {t('app.quiz.score', {
            percent: format.percent(result.scorePercent),
            points: result.scorePoints,
            max: result.maxPoints,
          })}
        </p>
        {result.attemptsLeft !== null && <p className="text-sm">{t('app.quiz.attemptsLeft', { count: result.attemptsLeft })}</p>}
        {!result.answersRevealed && <Alert kind="info">{t('app.quiz.answersHidden')}</Alert>}
        {onRetry && (
          <Button variant="primary" className="self-start" onClick={onRetry}>
            {t('app.quiz.retry')}
          </Button>
        )}
      </Card>

      <ol className="flex flex-col gap-3">
        {questions.map((question, index) => {
          const review = byId.get(question.id);
          if (!review) return null;
          const selected = answers[question.id] ?? [];
          return (
            <li key={question.id}>
              <Card className="card-body flex flex-col gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {review.correct ? (
                    <CircleCheck aria-hidden size={16} className="text-success" />
                  ) : (
                    <CircleX aria-hidden size={16} className="text-danger" />
                  )}
                  {t('app.quiz.questionOf', { current: index + 1, total: questions.length })} ·{' '}
                  {review.correct ? t('app.quiz.correct') : t('app.quiz.incorrect')}
                </p>
                <MarkdownView source={question.text} lang={language} />
                <ul className="flex flex-col gap-1 text-sm">
                  {question.options.map((option) => {
                    const chosen = selected.includes(option.id);
                    const isCorrect = review.correctOptionIds?.includes(option.id) ?? false;
                    if (!chosen && !isCorrect) return null;
                    return (
                      <li key={option.id} className="flex flex-wrap gap-2">
                        <span lang={language}>{option.text}</span>
                        {chosen && <Badge tone="neutral">{t('app.quiz.yourAnswer')}</Badge>}
                        {isCorrect && <Badge tone="success">{t('app.quiz.correctAnswer')}</Badge>}
                      </li>
                    );
                  })}
                </ul>
                {review.explanation && (
                  <div className="border-t border-border pt-3 text-sm text-text-muted">
                    <MarkdownView source={review.explanation} lang={language} />
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
