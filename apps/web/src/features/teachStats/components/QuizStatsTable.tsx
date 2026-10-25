import type { CourseStats } from '@learnly/contracts/instructor';
import { Card } from '../../../shared/components/Card';
import { Table } from '../../../shared/components/Table';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { toPercent } from '../utils';

type QuizRow = CourseStats['quizzes'][number];

export function QuizStatsTable({ quizzes }: { quizzes: CourseStats['quizzes'] }) {
  const { t } = useT();
  const format = useFormat();
  if (quizzes.length === 0) return null;
  return (
    <Card className="card-body flex flex-col gap-3">
      <h2 className="heading-md">{t('app.stats.quizzes')}</h2>
      <Table<QuizRow>
        caption={t('app.stats.quizzes')}
        rows={quizzes}
        rowKey={(quiz) => quiz.quizId}
        columns={[
          { key: 'title', header: t('app.stats.quiz'), render: (quiz) => quiz.title },
          {
            key: 'avg',
            header: t('app.stats.avgScore'),
            render: (quiz) => (quiz.avgScore === null ? t('app.stats.noData') : format.percent(quiz.avgScore)),
          },
          {
            key: 'first',
            header: t('app.stats.firstTryPass'),
            render: (quiz) => (quiz.firstTryPassShare === null ? t('app.stats.noData') : format.percent(toPercent(quiz.firstTryPassShare))),
          },
        ]}
      />
    </Card>
  );
}
