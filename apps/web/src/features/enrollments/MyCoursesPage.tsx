import { enrollmentStatusSchema } from '@learnly/contracts/enums';
import { Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Input } from '../../shared/components/Input';
import { Tabs } from '../../shared/components/Tabs';
import { useT } from '../locale/useT';
import { LeaveCourseDialog } from './components/LeaveCourseDialog';
import { MyCoursesList } from './components/MyCoursesList';
import { searchChanged, selectMyCoursesSearch, selectMyCoursesTab, tabChanged } from './enrollmentsSlice';

/** FR-LEARN-3: active and completed courses with a search by title. */
export function MyCoursesPage() {
  const { t } = useT();
  const dispatch = useDispatch();
  const tab = useSelector(selectMyCoursesTab);
  const search = useSelector(selectMyCoursesSearch);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="heading-xl">{t('app.myCourses.title')}</h1>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">{t('app.myCourses.search')}</span>
          <Search aria-hidden size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle" />
          <Input
            type="search"
            className="pl-9"
            placeholder={t('app.myCourses.search')}
            value={search}
            onChange={(event) => dispatch(searchChanged(event.target.value))}
          />
        </label>
      </div>
      <LeaveCourseDialog />
      <Tabs
        label={t('app.myCourses.tabsLabel')}
        value={tab}
        onValueChange={(value) => {
          const status = enrollmentStatusSchema.safeParse(value);
          if (status.success) dispatch(tabChanged(status.data));
        }}
        tabs={[
          { value: 'active', label: t('app.myCourses.tabActive'), content: <MyCoursesList status="active" /> },
          { value: 'completed', label: t('app.myCourses.tabCompleted'), content: <MyCoursesList status="completed" /> },
        ]}
      />
    </div>
  );
}
