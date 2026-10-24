import type { Accent } from '@learnly/contracts/enums';
import type { ReactNode } from 'react';
import { cx } from '../utils/cx';

interface TagProps {
  accent?: Accent | 'neutral';
  children: ReactNode;
  className?: string;
}

export function Tag({ accent = 'neutral', children, className }: TagProps) {
  return <span className={cx('tag', `tag-${accent}`, className)}>{children}</span>;
}
