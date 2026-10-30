import { Link } from 'react-router';
import { isApiError } from '../../shared/api/apiError';
import { buttonClass } from '../../shared/components/buttonClass';
import { ErrorState } from '../../shared/components/ErrorState';
import { describeError } from '../../shared/utils/describeError';
import { useT } from '../locale/useT';

interface QueryErrorStateProps {
  error: unknown;
  onRetry: () => void;
  /** Where a terminal failure (not found, no access) leads; the dashboard by default. */
  back?: { to: string; label: string };
}

/** FR-046: a failed request offers a retry when it is transient and a way to a safe place when it is not. */
export function QueryErrorState({ error, onRetry, back }: QueryErrorStateProps) {
  const i18n = useT();
  const { t } = i18n;
  return (
    <ErrorState
      message={describeError(error, i18n)}
      retryable={isApiError(error) && error.retryable}
      onRetry={onRetry}
      retryLabel={t('common.actions.retry')}
      fallbackAction={
        <Link to={back?.to ?? '/'} className={buttonClass('outline', 'sm')}>
          {back?.label ?? t('app.layout.dashboard')}
        </Link>
      }
    />
  );
}
