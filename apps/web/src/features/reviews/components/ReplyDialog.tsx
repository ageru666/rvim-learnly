import { LIMITS } from '@learnly/contracts/limits';
import type { InstructorReview } from '@learnly/contracts/reviews';
import type { FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { Alert } from '../../../shared/components/Alert';
import { Button } from '../../../shared/components/Button';
import { Dialog } from '../../../shared/components/Dialog';
import { FormField } from '../../../shared/components/FormField';
import { Textarea } from '../../../shared/components/Textarea';
import { describeError } from '../../../shared/utils/describeError';
import { useT } from '../../locale/useT';
import { useReplyToReviewMutation } from '../reviewsApi';
import { replyDialogToggled } from '../reviewsSlice';

interface ReplyDialogProps {
  review: InstructorReview | null;
}

export function ReplyDialog({ review }: ReplyDialogProps) {
  const i18n = useT();
  const { t } = i18n;
  const dispatch = useDispatch();
  const [reply, { isLoading, error, reset }] = useReplyToReviewMutation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review) return;
    const value = new FormData(event.currentTarget).get('text');
    const text = typeof value === 'string' ? value : '';
    void reply({ reviewId: review.id, text });
  }

  return (
    <Dialog
      open={review !== null}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          dispatch(replyDialogToggled(null));
        }
      }}
      title={t('app.teachReviews.replyTitle')}
      closeLabel={t('common.actions.close')}
    >
      {review && (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <blockquote className="border-l-4 border-border pl-3 text-sm text-text-muted">{review.text}</blockquote>
          {error && <Alert kind="error">{describeError(error, i18n)}</Alert>}
          <FormField label={t('app.teachReviews.replyLabel')} hint={t('app.teachReviews.replyHint')}>
            {(control) => (
              <Textarea
                {...control}
                name="text"
                rows={4}
                required
                maxLength={LIMITS.reviewReply.max}
                defaultValue={review.authorReply ?? ''}
              />
            )}
          </FormField>
          <Button type="submit" variant="primary" className="self-end" loading={isLoading}>
            {t('app.teachReviews.send')}
          </Button>
        </form>
      )}
    </Dialog>
  );
}
