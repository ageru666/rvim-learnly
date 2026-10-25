import type { ModuleDto } from '@learnly/contracts/instructor';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { IconButton } from '../../../shared/components/IconButton';
import { useT } from '../../locale/useT';

interface SortableModuleProps {
  module: ModuleDto;
  disabled: boolean;
  onRename: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  children: ReactNode;
}

export function SortableModule({ module, disabled, onRename, onDelete, onAddLesson, children }: SortableModuleProps) {
  const { t } = useT();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id: module.id,
    data: { type: 'module' },
    disabled,
  });
  // Empty modules still accept dropped lessons.
  const { setNodeRef: setDropRef } = useDroppable({ id: `drop:${module.id}`, data: { type: 'module', moduleId: module.id } });

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <Card className="card-body flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {!disabled && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              className="focus-ring cursor-grab rounded-sm p-1 text-text-muted"
              aria-label={t('app.curriculum.dragHandle', { title: module.title })}
              {...attributes}
              {...listeners}
            >
              <GripVertical aria-hidden size={18} />
            </button>
          )}
          <h3 className="heading-md flex-1">{module.title}</h3>
          {!disabled && (
            <>
              <IconButton label={t('app.curriculum.renameModule')} icon={<Pencil aria-hidden size={16} />} onClick={onRename} />
              <IconButton label={t('app.curriculum.deleteModule')} icon={<Trash2 aria-hidden size={16} />} onClick={onDelete} />
            </>
          )}
        </div>
        <SortableContext items={module.lessons.map((lesson) => lesson.id)} strategy={verticalListSortingStrategy}>
          <ol ref={setDropRef} className="flex min-h-10 flex-col gap-2">
            {children}
          </ol>
        </SortableContext>
        {!disabled && (
          <Button size="sm" variant="ghost" className="self-start" onClick={onAddLesson}>
            <Plus aria-hidden size={14} />
            {t('app.curriculum.addLesson')}
          </Button>
        )}
      </Card>
    </li>
  );
}
