import type { InstructorReview } from '@learnly/contracts/reviews';
import { Avatar } from '../../../shared/components/Avatar';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';
import { StarRating } from '../../../shared/components/StarRating';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';

interface ReviewItemProps {
  review: InstructorReview;
  onReply: () => void;
}

export function ReviewItem({ review, onReply }: ReviewItemProps) {
  const { t } = useT();
  const format = useFormat();
  return (
    <Card className="card-body mb-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Avatar name={review.user.name} src={review.user.avatarUrl} />
        <span className="font-semibold">{review.user.name}</span>
        <StarRating value={review.rating} label={t('site.course.ratingOutOf', { value: review.rating })} />
        <span className="text-xs text-text-muted">{format.date(review.createdAt)}</span>
        {review.hidden && <Badge tone="warning">{t('app.teachReviews.hidden')}</Badge>}
      </div>
      <p className="text-sm text-text-muted">{review.course.title}</p>
      <p>{review.text}</p>
      {review.authorReply && (
        <div className="rounded-md border-l-4 border-border-strong bg-surface-sunken p-3 text-sm">
          <p className="font-semibold">{t('app.teachReviews.yourReply')}</p>
          <p>{review.authorReply}</p>
        </div>
      )}
      <Button size="sm" variant="outline" className="self-start" onClick={onReply}>
        {review.authorReply ? t('app.teachReviews.editReply') : t('app.teachReviews.reply')}
      </Button>
    </Card>
  );
}
