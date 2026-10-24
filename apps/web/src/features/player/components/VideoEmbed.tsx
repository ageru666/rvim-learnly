import { buildEmbedUrl, parseVideoUrl } from '@learnly/contracts/video';
import { useSelector } from 'react-redux';
import { useT } from '../../locale/useT';
import { selectLocale } from '../../locale/localeSlice';

interface VideoEmbedProps {
  url: string;
  title: string;
}

/** YouTube (no-cookie domain) or Vimeo player; the player UI follows the interface language. */
export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const { t } = useT();
  const locale = useSelector(selectLocale);
  const video = parseVideoUrl(url);
  if (!video) return null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-surface-sunken">
      <iframe
        src={buildEmbedUrl(video, locale)}
        title={t('app.player.videoTitle', { title })}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
