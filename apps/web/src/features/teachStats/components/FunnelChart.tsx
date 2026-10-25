import type { CourseStats } from '@learnly/contracts/instructor';
import { TriangleAlert } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../../shared/components/Card';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { biggestDrop, funnelSeries, toPercent } from '../utils';
import { ChartDataTable } from './ChartDataTable';

const ROW_HEIGHT = 32;

/** Share of students who completed each lesson; the largest drop is highlighted and named in text. */
export function FunnelChart({ funnel }: { funnel: CourseStats['funnel'] }) {
  const { t } = useT();
  const format = useFormat();
  const data = funnelSeries(funnel);
  const drop = biggestDrop(funnel);

  return (
    <Card className="card-body flex flex-col gap-3">
      <h2 className="heading-md">{t('app.stats.funnel')}</h2>
      <p className="flex items-center gap-2 text-sm">
        {drop && <TriangleAlert aria-hidden size={16} className="text-warning" />}
        {drop ? t('app.stats.biggestDrop', { title: drop.title, drop: format.percent(toPercent(drop.drop)) }) : t('app.stats.noDrop')}
      </p>
      <div role="img" aria-label={t('app.stats.funnel')} style={{ height: Math.max(ROW_HEIGHT * 2, data.length * ROW_HEIGHT) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
            <XAxis type="number" domain={[0, 100]} tickFormatter={(value: number) => format.percent(value)} tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }} stroke="var(--color-chart-axis)" />
            <YAxis type="category" dataKey="title" width={160} tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }} stroke="var(--color-chart-axis)" />
            <Tooltip formatter={(value) => [format.percent(Number(value)), '']} />
            <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
              {data.map((step) => (
                <Cell key={step.lessonId} fill={step.lessonId === drop?.lessonId ? 'var(--color-accent-red)' : 'var(--color-accent-indigo)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        summary={t('app.stats.chartData')}
        headers={[t('app.stats.lesson'), t('app.stats.completed')]}
        rows={data.map((step) => ({ key: step.lessonId, label: step.title, value: format.percent(step.percent) }))}
      />
    </Card>
  );
}
