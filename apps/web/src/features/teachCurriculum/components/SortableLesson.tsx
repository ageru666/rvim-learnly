import type { ModuleDto } from '@learnly/contracts/instructor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { IconButton } from '../../../shared/components/IconButton';
import { Switch } from '../../../shared/components/Switch';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { LessonTypeIcon } from '../../../shared/components/LessonTypeIcon';

interface SortableLessonProps {
  lesson: ModuleDto['lessons'][number];
  disabled: boolean;
  onMove: (delta: -1 | 1) => void;
  onTogglePreview: (isPreview: boolean) => void;
  onDelete: () => void;
}

export function SortableLesson({ lesson, disabled, onMove, onTogglePreview, onDelete }: SortableLessonProps) {
  const { t, translate } = useT();
  const format = useFormat();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: 'lesson' },
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-2 ${isDragging ? 'opacity-60' : ''}`}
    >
      {!disabled && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="focus-ring cursor-grab rounded-sm p-1 text-text-muted"
          aria-label={t('app.curriculum.dragHandle', { title: lesson.title })}
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden size={16} />
        </button>
      )}
      <LessonTypeIcon type={lesson.type} />
      <span className="sr-only">{translate(`enums.lessonType.${lesson.type}`)}</span>
      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
      <span className="text-xs text-text-muted">{format.duration(lesson.durationMinutes)}</span>
      <Switch
        checked={lesson.isPreview}
        onCheckedChange={onTogglePreview}
        label={t('app.curriculum.preview')}
        disabled={disabled}
      />
      {!disabled && (
        <>
          <IconButton label={t('app.curriculum.moveUp', { title: lesson.title })} icon={<ArrowUp aria-hidden size={14} />} onClick={() => onMove(-1)} />
          <IconButton label={t('app.curriculum.moveDown', { title: lesson.title })} icon={<ArrowDown aria-hidden size={14} />} onClick={() => onMove(1)} />
        </>
      )}
      <Link to={`/teach/lessons/${lesson.id}`} className="btn btn-ghost btn-icon btn-sm" aria-label={t('app.curriculum.editLesson')}>
        <Pencil aria-hidden size={14} />
      </Link>
      {!disabled && <IconButton label={t('app.curriculum.deleteLesson')} icon={<Trash2 aria-hidden size={14} />} onClick={onDelete} />}
    </li>
  );
}
