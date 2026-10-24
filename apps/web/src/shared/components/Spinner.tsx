import { LoaderCircle } from 'lucide-react';
import { cx } from '../utils/cx';

interface SpinnerProps {
  size?: number;
  className?: string;
}

/** Decorative; the surrounding control exposes the busy state with `aria-busy`. */
export function Spinner({ size = 20, className }: SpinnerProps) {
  return <LoaderCircle aria-hidden size={size} className={cx('animate-spin', className)} />;
}
