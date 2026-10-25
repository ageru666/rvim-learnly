import { buildEmbedUrl, parseVideoUrl } from '@learnly/contracts/video';
import { useSelector } from 'react-redux';
import { FormField } from '../../../shared/components/FormField';
import { Input } from '../../../shared/components/Input';
import { selectLocale } from '../../locale/localeSlice';
import { useT } from '../../locale/useT';
import { VideoMetaCard } from '../../videoEmbed/VideoMetaCard';

interface VideoLessonFieldsProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
}

/** The YouTube/Vimeo link with a live preview once the link is recognized. */
export function VideoLessonFields({ value, onChange, error, disabled }: VideoLessonFieldsProps) {
  const { t } = useT();
  const locale = useSelector(selectLocale);
  const video = value.trim() ? parseVideoUrl(value.trim()) : null;

  return (
    <div className="flex flex-col gap-3">
      <FormField label={t('app.lessonEditor.videoUrl')} hint={t('app.lessonEditor.videoHint')} error={error}>
        {(field) => <Input {...field} type="url" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />}
      </FormField>
      {video && <VideoMetaCard url={value.trim()} />}
      {video && (
        <div className="aspect-video w-full max-w-xl overflow-hidden rounded-lg bg-surface-sunken">
          <iframe
            src={buildEmbedUrl(video, locale)}
            title={t('app.player.videoTitle', { title: value })}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
