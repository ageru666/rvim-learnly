import type { LessonType } from '@learnly/contracts/enums';
import { FileText, ListChecks, PlayCircle, type LucideIcon } from 'lucide-react';

const ICONS: Record<LessonType, LucideIcon> = {
  text: FileText,
  video: PlayCircle,
  quiz: ListChecks,
};

interface LessonTypeIconProps {
  type: LessonType;
  size?: number;
}

export function LessonTypeIcon({ type, size = 16 }: LessonTypeIconProps) {
  const Icon = ICONS[type];
  return <Icon aria-hidden size={size} className="shrink-0 text-text-muted" />;
}
