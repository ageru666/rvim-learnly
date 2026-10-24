import { Alert } from '../../../shared/components/Alert';
import { useT } from '../../locale/useT';

/** FR-LEARN-8: the author sees the course as a student would, without saving progress. */
export function PreviewBanner() {
  const { t } = useT();
  return <Alert kind="info">{t('app.player.previewBanner')}</Alert>;
}
