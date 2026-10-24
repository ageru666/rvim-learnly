import { Badge } from '../../../shared/components/Badge';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { useGetAttemptsQuery } from '../quizzesApi';

interface AttemptHistoryProps {
  quizId: string;
}

/** FR-QUIZ-7. */
export function AttemptHistory({ quizId }: AttemptHistoryProps) {
  const { t } = useT();
  const format = useFormat();
  const { data: attempts } = useGetAttemptsQuery(quizId);
  if (!attempts) return null;

  return (
    <section className="flex flex-col gap-2" aria-labelledby={`history-${quizId}`}>
      <h2 id={`history-${quizId}`} className="text-sm font-semibold">
        {t('app.quiz.history')}
      </h2>
      {attempts.length === 0 ? (
        <p className="text-sm text-text-muted">{t('app.quiz.historyEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {attempts.map((attempt) => (
            <li key={attempt.id} className="flex flex-wrap items-center gap-2">
              <span>
                {t('app.quiz.attemptRow', {
                  date: format.date(attempt.submittedAt, 'dateTime'),
                  percent: format.percent(attempt.scorePercent),
                })}
              </span>
              <Badge tone={attempt.passed ? 'success' : 'neutral'}>
                {attempt.passed ? t('app.quiz.passed') : t('app.quiz.failed')}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
