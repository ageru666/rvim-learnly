import { PartyPopper } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { buttonClass } from '../../shared/components/buttonClass';
import { Card } from '../../shared/components/Card';
import { PageLoader } from '../../shared/components/PageLoader';
import { config } from '../../shared/config';
import { useGetMyCertificatesQuery } from '../certificates/certificatesApi';
import { useT } from '../locale/useT';
import { QueryErrorState } from '../navigation/QueryErrorState';
import { useGetLearnCourseQuery } from './playerApi';

/** FR-LEARN-5: `/app/learn/:courseId/completed`, shown right after the last lesson or quiz. */
export function CourseCompletedPage() {
  const { t } = useT();
  const { courseId = '' } = useParams();
  const { data: course, error, refetch } = useGetLearnCourseQuery(courseId);
  const { data: certificates } = useGetMyCertificatesQuery();
  if (error) {
    return (
      <main id="main" className="page-container py-8">
        <QueryErrorState error={error} onRetry={() => void refetch()} back={{ to: '/courses', label: t('site.header.myCourses') }} />
      </main>
    );
  }
  if (!course) return <PageLoader />;
  const certificate = certificates?.find((item) => item.courseId === courseId);

  return (
    <main id="main" className="page-container flex justify-center py-16">
      <Card className="card-body flex max-w-xl flex-col items-center gap-4 text-center">
        <PartyPopper aria-hidden size={48} className="text-accent-yellow" />
        <h1 className="heading-xl">{t('app.completed.title')}</h1>
        <p className="text-lead">{t('app.completed.text', { title: course.course.title })}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {certificate && (
            <a href={certificate.url} className={buttonClass('primary')}>
              {t('app.completed.certificate')}
            </a>
          )}
          <a href={`${config.siteUrl}courses/${course.course.slug}#reviews`} className={buttonClass('outline')}>
            {t('app.completed.review')}
          </a>
          <Link to="/" className={buttonClass('ghost')}>
            {t('app.completed.dashboard')}
          </Link>
        </div>
      </Card>
    </main>
  );
}
