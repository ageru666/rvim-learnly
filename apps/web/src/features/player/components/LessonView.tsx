import type { Locale } from '@learnly/contracts/enums';
import type { LessonContent } from '@learnly/contracts/learning';
import { Alert } from '../../../shared/components/Alert';
import { MarkdownView } from '../../../shared/components/MarkdownView';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { LessonTypeIcon } from './LessonTypeIcon';
import { VideoEmbed } from './VideoEmbed';

interface LessonViewProps {
  lesson: LessonContent;
  /** The course content language: set as `lang` so screen readers pronounce it correctly. */
  language: Locale;
}

export function LessonView({ lesson, language }: LessonViewProps) {
  const { translate, t } = useT();
  const format = useFormat();

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <LessonTypeIcon type={lesson.type} />
          {translate(`enums.lessonType.${lesson.type}`)} · {format.duration(lesson.durationMinutes)}
        </p>
        <h1 className="heading-xl" lang={language}>
          {lesson.title}
        </h1>
      </header>
      {lesson.type === 'video' && lesson.videoUrl && <VideoEmbed url={lesson.videoUrl} title={lesson.title} />}
      {lesson.type === 'quiz' && <Alert kind="info">{t('app.player.quizHint')}</Alert>}
      {lesson.content && <MarkdownView source={lesson.content} lang={language} />}
    </article>
  );
}
