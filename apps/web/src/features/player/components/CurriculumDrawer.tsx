import type { LearnCourse } from '@learnly/contracts/learning';
import { useDispatch, useSelector } from 'react-redux';
import { Drawer } from '../../../shared/components/Drawer';
import { useT } from '../../locale/useT';
import { curriculumToggled, selectCurriculumOpen } from '../playerSlice';
import { CurriculumList } from './CurriculumList';

interface CurriculumDrawerProps {
  course: LearnCourse;
  currentLessonId: string;
}

export function CurriculumDrawer({ course, currentLessonId }: CurriculumDrawerProps) {
  const { t } = useT();
  const dispatch = useDispatch();
  const open = useSelector(selectCurriculumOpen);
  const close = () => dispatch(curriculumToggled(false));

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => dispatch(curriculumToggled(next))}
      title={t('app.player.curriculum')}
      closeLabel={t('common.actions.close')}
    >
      <CurriculumList course={course} currentLessonId={currentLessonId} onNavigate={close} />
    </Drawer>
  );
}
