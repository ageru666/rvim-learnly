import type { LearnCourse, LessonContent } from '@learnly/contracts/learning';
import { ArrowLeft, ArrowRight, CircleCheck } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { buttonClass } from '../../../shared/components/buttonClass';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { useSetLessonCompletionMutation } from '../playerApi';
import { findAdjacentLessons } from '../utils';

interface LessonFooterProps {
  course: LearnCourse;
  lesson: LessonContent;
}

/** BR-L1: text and video lessons are marked by hand; quiz lessons are completed by passing the quiz. */
export function LessonFooter({ course, lesson }: LessonFooterProps) {
  const i18n = useT();
  const { t } = i18n;
  const [setCompletion, { isLoading, error }] = useSetLessonCompletionMutation();
  const { previous, next } = findAdjacentLessons(course.modules, lesson.id);
  const canMark = course.mode === 'student' && lesson.type !== 'quiz';
  const lessonPath = (id: string) => `/learn/${course.course.id}/${id}`;

  return (
    <footer className="flex flex-col gap-4 border-t border-border pt-6">
      {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {previous ? (
          <Link to={lessonPath(previous.id)} className={buttonClass('outline')}>
            <ArrowLeft aria-hidden size={16} />
            {t('app.player.previous')}
          </Link>
        ) : (
          <span />
        )}
        {canMark && (
          <Button
            variant={lesson.completed ? 'outline' : 'primary'}
            loading={isLoading}
            onClick={() =>
              void setCompletion({ courseId: course.course.id, lessonId: lesson.id, completed: !lesson.completed })
            }
          >
            {lesson.completed && <CircleCheck aria-hidden size={16} />}
            {lesson.completed ? t('app.player.markIncomplete') : t('app.player.markComplete')}
          </Button>
        )}
        {next ? (
          <Link to={lessonPath(next.id)} className={buttonClass('outline')}>
            {t('app.player.next')}
            <ArrowRight aria-hidden size={16} />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </footer>
  );
}
