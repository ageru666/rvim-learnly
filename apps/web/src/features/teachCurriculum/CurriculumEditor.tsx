import type { CourseEditor, ModuleDto } from '@learnly/contracts/instructor';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ListTree, Plus } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { describeError } from '../../shared/utils/describeError';
import { useT } from '../locale/useT';
import { CurriculumDialogs } from './components/CurriculumDialogs';
import { SortableLesson } from './components/SortableLesson';
import { SortableModule } from './components/SortableModule';
import { dialogOpened, orderChanged, selectPendingOrder } from './curriculumSlice';
import { useSetLessonPreviewMutation, useSetStructureMutation } from './teachCurriculumApi';
import { coursePosition, DROP_PREFIX, dropTarget, isDropCandidate, moveModule, shiftLesson, toStructurePayload, moveLesson } from './utils';

/** FR-TEACH-3 "Curriculum": modules and lessons as a tree, reordered by drag and drop or buttons. */
export function CurriculumEditor({ course }: { course: CourseEditor }) {
  const i18n = useT();
  const { t } = i18n;
  const dispatch = useDispatch();
  const pending = useSelector(selectPendingOrder);
  const modules = pending ?? course.modules;
  const [setStructure, { error }] = useSetStructureMutation();
  const [setPreview] = useSetLessonPreviewMutation();
  const disabled = !course.editable;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function commit(next: ModuleDto[]) {
    dispatch(orderChanged(next));
    void setStructure({ courseId: course.id, structure: toStructurePayload(next) });
  }

  const titleOf = (id: string | number) => {
    const key = String(id);
    const module = modules.find((item) => item.id === key);
    return module?.title ?? modules.flatMap((item) => item.lessons).find((lesson) => lesson.id === key)?.title ?? '';
  };
  const positionOf = (id: string | number) => {
    const key = String(id).replace(DROP_PREFIX, '');
    const moduleIndex = modules.findIndex((item) => item.id === key);
    return moduleIndex === -1 ? coursePosition(modules, key) : moduleIndex + 1;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('app.curriculum.dragStart', { title: titleOf(active.id) }),
    onDragOver: ({ active, over }) => (over ? t('app.curriculum.dragOver', { title: titleOf(active.id), position: positionOf(over.id) }) : undefined),
    onDragEnd: ({ active, over }) => (over ? t('app.curriculum.dragEnd', { title: titleOf(active.id), position: positionOf(over.id) }) : undefined),
    onDragCancel: ({ active }) => t('app.curriculum.dragCancel', { title: titleOf(active.id) }),
  };

  const collisionDetection: CollisionDetection = (args) => {
    const dragged = args.active.data.current?.type === 'module' ? 'module' : 'lesson';
    const droppableContainers = args.droppableContainers.filter((container) =>
      isDropCandidate(modules, dragged, { id: String(container.id), type: container.data.current?.type }),
    );
    return closestCenter({ ...args, droppableContainers });
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id).replace(DROP_PREFIX, '');
    if (active.data.current?.type === 'module') {
      const from = modules.findIndex((module) => module.id === activeId);
      const to = modules.findIndex((module) => module.id === overId);
      if (from !== -1 && to !== -1) commit(moveModule(modules, from, to));
      return;
    }
    const target = dropTarget(modules, overId);
    if (target) commit(moveLesson(modules, activeId, target.moduleId, target.index));
  }

  return (
    <section className="flex flex-col gap-4" aria-label={t('app.curriculum.title')}>
      {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
      {modules.length === 0 ? (
        <EmptyState icon={<ListTree aria-hidden size={40} />} title={t('app.curriculum.empty')} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd} accessibility={{ announcements }}>
          <SortableContext items={modules.map((module) => module.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-4">
              {modules.map((module) => (
                <SortableModule
                  key={module.id}
                  module={module}
                  disabled={disabled}
                  onRename={() => dispatch(dialogOpened({ kind: 'renameModule', moduleId: module.id, title: module.title }))}
                  onDelete={() => dispatch(dialogOpened({ kind: 'deleteModule', moduleId: module.id, title: module.title }))}
                  onAddLesson={() => dispatch(dialogOpened({ kind: 'addLesson', moduleId: module.id }))}
                >
                  {module.lessons.map((lesson) => (
                    <SortableLesson
                      key={lesson.id}
                      lesson={lesson}
                      disabled={disabled}
                      onMove={(delta) => commit(shiftLesson(modules, lesson.id, delta))}
                      onTogglePreview={(isPreview) => void setPreview({ courseId: course.id, lessonId: lesson.id, isPreview })}
                      onDelete={() => dispatch(dialogOpened({ kind: 'deleteLesson', lessonId: lesson.id, title: lesson.title }))}
                    />
                  ))}
                </SortableModule>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
      {!disabled && (
        <Button variant="outline" className="self-start" onClick={() => dispatch(dialogOpened({ kind: 'addModule' }))}>
          <Plus aria-hidden size={16} />
          {t('app.curriculum.addModule')}
        </Button>
      )}
      <CurriculumDialogs courseId={course.id} />
    </section>
  );
}
