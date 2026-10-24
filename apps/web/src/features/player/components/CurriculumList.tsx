import type { LearnCourse } from '@learnly/contracts/learning';
import { ChevronDown, CircleCheck, Circle } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink } from 'react-router';
import { cx } from '../../../shared/utils/cx';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { moduleToggled, selectCollapsedModules } from '../../navigation/navigationSlice';
import { LessonTypeIcon } from './LessonTypeIcon';

interface CurriculumListProps {
  course: LearnCourse;
  currentLessonId: string;
  onNavigate?: () => void;
}

/** Modules collapse independently; the choice is kept on this device (`ui` storage key). */
export function CurriculumList({ course, currentLessonId, onNavigate }: CurriculumListProps) {
  const { t, translate } = useT();
  const format = useFormat();
  const dispatch = useDispatch();
  const collapsed = useSelector(selectCollapsedModules(course.course.id));

  return (
    <nav aria-label={t('app.player.curriculum')}>
      <ol className="flex flex-col gap-2">
        {course.modules.map((module) => {
          const open = !collapsed.includes(module.id);
          const listId = `module-${module.id}`;
          return (
            <li key={module.id}>
              <button
                type="button"
                className="focus-ring flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm font-semibold hover:bg-surface-hover"
                aria-expanded={open}
                aria-controls={listId}
                aria-label={t('app.player.toggleModule', { title: module.title })}
                onClick={() => dispatch(moduleToggled({ courseId: course.course.id, moduleId: module.id }))}
              >
                <span>{module.title}</span>
                <ChevronDown aria-hidden size={16} className={cx('shrink-0 transition-transform', !open && '-rotate-90')} />
              </button>
              <ol id={listId} hidden={!open} className="mt-1 flex flex-col gap-0.5">
                {module.lessons.map((lesson) => {
                  const current = lesson.id === currentLessonId;
                  return (
                    <li key={lesson.id}>
                      <NavLink
                        to={`/learn/${course.course.id}/${lesson.id}`}
                        onClick={onNavigate}
                        aria-current={current ? 'page' : undefined}
                        className={cx(
                          'focus-ring flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-surface-hover',
                          current && 'bg-surface-selected font-semibold',
                        )}
                      >
                        {lesson.completed ? (
                          <CircleCheck aria-label={t('app.player.completed')} size={16} className="shrink-0 text-success" />
                        ) : (
                          <Circle aria-label={t('app.player.notCompleted')} size={16} className="shrink-0 text-text-subtle" />
                        )}
                        <LessonTypeIcon type={lesson.type} />
                        <span className="flex-1">{lesson.title}</span>
                        <span className="sr-only">{translate(`enums.lessonType.${lesson.type}`)}</span>
                        <span className="text-xs text-text-muted">{format.duration(lesson.durationMinutes)}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
