import type { LearnCourse } from '@learnly/contracts/learning';
import { ArrowLeft, ListTree, NotebookPen } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { buttonClass } from '../../../shared/components/buttonClass';
import { IconButton } from '../../../shared/components/IconButton';
import { ProgressBar } from '../../../shared/components/ProgressBar';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { curriculumToggled, notesToggled, selectNotesOpen } from '../playerSlice';

interface PlayerHeaderProps {
  course: LearnCourse;
}

export function PlayerHeader({ course }: PlayerHeaderProps) {
  const { t } = useT();
  const format = useFormat();
  const dispatch = useDispatch();
  const notesOpen = useSelector(selectNotesOpen);
  const progressText = t('app.player.progress', { value: format.percent(course.progress) });

  return (
    <header className="flex items-center gap-3 border-b border-border bg-bg px-4 py-3">
      <IconButton
        className="lg:hidden"
        label={t('app.player.openCurriculum')}
        icon={<ListTree aria-hidden size={20} />}
        onClick={() => dispatch(curriculumToggled(true))}
      />
      <Link to="/" className={buttonClass('ghost', 'sm')}>
        <ArrowLeft aria-hidden size={16} />
        <span className="hidden sm:inline">{t('app.player.exit')}</span>
      </Link>
      <p className="min-w-0 flex-1 truncate font-semibold">{course.course.title}</p>
      <IconButton
        className="hidden md:inline-flex"
        label={notesOpen ? t('app.notes.close') : t('app.notes.open')}
        icon={<NotebookPen aria-hidden size={18} />}
        aria-pressed={notesOpen}
        onClick={() => dispatch(notesToggled())}
      />
      {course.mode === 'student' && (
        <div className="hidden w-48 md:block">
          <ProgressBar value={course.progress} label={progressText} showLabel />
        </div>
      )}
    </header>
  );
}
