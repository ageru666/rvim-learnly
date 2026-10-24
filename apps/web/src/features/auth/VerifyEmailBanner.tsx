import { useSelector } from 'react-redux';
import { isApiError } from '../../shared/api/apiError';
import { Alert } from '../../shared/components/Alert';
import { Button } from '../../shared/components/Button';
import { describeError } from '../../shared/utils/describeError';
import { useT } from '../locale/useT';
import { useGetMeQuery, useResendVerificationMutation } from './authApi';
import { selectResendAvailableAt } from './authSlice';
import { useSecondsUntil } from './useSecondsUntil';

/** Reminds an unverified user to confirm the email and resends the link at most once a minute. */
export function VerifyEmailBanner() {
  const i18n = useT();
  const { data: me } = useGetMeQuery();
  const [resend, { isLoading, isSuccess, error }] = useResendVerificationMutation();
  const secondsLeft = useSecondsUntil(useSelector(selectResendAvailableAt));

  if (!me || me.emailVerified) return null;

  const action =
    secondsLeft > 0 ? (
      <span className="text-sm whitespace-nowrap">{i18n.t('common.verifyBanner.cooldown', { seconds: secondsLeft })}</span>
    ) : (
      <Button size="sm" variant="outline" loading={isLoading} onClick={() => void resend()}>
        {i18n.t('common.verifyBanner.resend')}
      </Button>
    );

  return (
    <Alert kind="warning" action={action}>
      {isSuccess ? i18n.t('common.verifyBanner.sent', { email: me.email }) : i18n.t('common.verifyBanner.text')}
      {/* A rate-limit answer is already shown as the countdown. */}
      {error && !(isApiError(error) && error.code === 'RATE_LIMITED') && <p className="mt-1">{describeError(error, i18n)}</p>}
    </Alert>
  );
}

