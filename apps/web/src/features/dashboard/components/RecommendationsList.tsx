import type { CourseCard } from '@learnly/contracts/catalog';
import { Card } from '../../../shared/components/Card';
import { StarRating } from '../../../shared/components/StarRating';
import { Tag } from '../../../shared/components/Tag';
import { config } from '../../../shared/config';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';

interface RecommendationsListProps {
  courses: CourseCard[];
}

/** Course pages live on the SSR site, so the cards are plain links out of the SPA. */
export function RecommendationsList({ courses }: RecommendationsListProps) {
  const { t } = useT();
  const format = useFormat();
  if (courses.length === 0) return null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="recommendations-heading">
      <h2 id="recommendations-heading" className="heading-lg">
        {t('app.dashboard.recommendationsHeading')}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {courses.map((course) => (
          <li key={course.id}>
            <a href={`${config.siteUrl}courses/${course.slug}`} className="focus-ring block h-full rounded-lg">
              <Card className="flex h-full flex-col overflow-hidden hover:bg-surface-hover">
                {course.coverUrl && (
                  <img src={course.coverUrl} alt="" className="aspect-video w-full object-cover" width="320" height="180" />
                )}
                <div className="card-body flex flex-1 flex-col gap-2">
                  {course.category.name && <Tag accent={course.category.accent}>{course.category.name}</Tag>}
                  <p className="font-semibold">{course.title}</p>
                  <p className="mt-auto flex items-center justify-between gap-2 text-sm text-text-muted">
                    <span>{t('common.counts.lessons', { count: course.lessonCount })}</span>
                    <span>{format.duration(course.totalMinutes)}</span>
                  </p>
                  {course.rating.avg !== null && <StarRating value={course.rating.avg} label={t('site.course.ratingOutOf', { value: format.number(course.rating.avg) })} />}
                </div>
              </Card>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
