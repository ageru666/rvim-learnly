import { useSelector } from 'react-redux';
import { Alert } from '../../shared/components/Alert';
import { Spinner } from '../../shared/components/Spinner';
import { selectLocale } from '../locale/localeSlice';
import { useT } from '../locale/useT';
import { useGetVideoMetaQuery, type VideoMetaError } from './videoEmbedApi';

function isVideoError(error: unknown): error is VideoMetaError {
  return typeof error === 'object' && error !== null && 'kind' in error;
}

/** Title, author and thumbnail of a video link; a failed check never blocks saving (FR-EXT-3). */
export function VideoMetaCard({ url }: { url: string }) {
  const { t } = useT();
  const locale = useSelector(selectLocale);
  const { data, error, isFetching } = useGetVideoMetaQuery({ url, locale });

  if (isFetching) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-muted" role="status">
        <Spinner size={14} />
        {t('app.videoMeta.loading')}
      </p>
    );
  }
  if (isVideoError(error)) {
    return <Alert kind={error.kind === 'not_found' ? 'warning' : 'info'}>{error.kind === 'not_found' ? t('app.videoMeta.notFound') : t('app.videoMeta.unavailable')}</Alert>;
  }
  if (!data) return null;
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      {data.thumbnailUrl && <img src={data.thumbnailUrl} alt="" className="h-16 w-28 shrink-0 rounded-sm object-cover" width="112" height="64" />}
      <div className="min-w-0">
        <p className="truncate font-semibold">{data.title}</p>
        {data.authorName && <p className="text-sm text-text-muted">{t('app.videoMeta.by', { author: data.authorName })}</p>}
      </div>
    </div>
  );
}
