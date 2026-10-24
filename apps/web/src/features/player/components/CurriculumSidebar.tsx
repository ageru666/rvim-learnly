import type { LearnCourse } from '@learnly/contracts/learning';
import { CurriculumList } from './CurriculumList';

interface CurriculumSidebarProps {
  course: LearnCourse;
  currentLessonId: string;
}

/** The curriculum next to the lesson on wide screens; small screens use `CurriculumDrawer`. */
export function CurriculumSidebar({ course, currentLessonId }: CurriculumSidebarProps) {
  return (
    <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-border p-4 lg:block">
      <CurriculumList course={course} currentLessonId={currentLessonId} />
    </aside>
  );
}
