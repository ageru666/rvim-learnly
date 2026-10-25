import type { CourseStats } from '@learnly/contracts/instructor';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../../shared/components/Card';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { weeklySeries } from '../utils';
import { ChartDataTable } from './ChartDataTable';

const CHART_HEIGHT = 240;

/** Enrollments per week for the last 12 weeks (FR-TEACH-6). */
export function EnrollmentsChart({ weeks }: { weeks: CourseStats['enrollmentsByWeek'] }) {
  const { t } = useT();
  const format = useFormat();
  const data = weeklySeries(weeks, (date) => format.date(date));

  return (
    <Card className="card-body flex flex-col gap-3">
      <h2 className="heading-md">{t('app.stats.enrollments')}</h2>
      <div role="img" aria-label={t('app.stats.enrollments')} style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }} stroke="var(--color-chart-axis)" interval={1} />
            <YAxis allowDecimals={false} tickFormatter={(value: number) => format.number(value)} tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }} stroke="var(--color-chart-axis)" />
            <Tooltip
              formatter={(value) => [t('app.stats.enrollmentsCount', { count: Number(value) }), '']}
              labelFormatter={(label) => t('app.stats.weekOf', { date: typeof label === 'string' ? label : '' })}
            />
            <Bar dataKey="count" fill="var(--color-accent-blue)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable
        summary={t('app.stats.chartData')}
        headers={[t('app.stats.week'), t('app.stats.enrollmentsShort')]}
        rows={data.map((week) => ({ key: week.weekStart, label: t('app.stats.weekOf', { date: week.label }), value: format.number(week.count) }))}
      />
    </Card>
  );
}
