import { Star } from 'lucide-react';
import { cx } from '../utils/cx';

const STARS = [1, 2, 3, 4, 5] as const;

interface StarRatingProps {
  value: number;
  /** Accessible text, e.g. "4.3 out of 5". */
  label: string;
  size?: number;
}

/** Read-only rating; the stars are decorative and the label carries the value. */
export function StarRating({ value, label, size = 16 }: StarRatingProps) {
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
      {STARS.map((star) => (
        <Star
          key={star}
          aria-hidden
          size={size}
          className={cx(star <= Math.round(value) ? 'fill-accent-yellow text-accent-yellow' : 'text-border-strong')}
        />
      ))}
    </span>
  );
}
