import type { Accent } from '@learnly/contracts/enums';
import type { ReactNode } from 'react';
import { Tag } from './Tag';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_TO_TAG: Record<StatusTone, Accent | 'neutral'> = {
  success: 'green',
  warning: 'yellow',
  danger: 'red',
  info: 'blue',
  neutral: 'neutral',
};

/** A status pill: always text plus an optional icon, never colour alone (guideline §4.3). */
export function Badge({ tone, icon, children }: { tone: StatusTone; icon?: ReactNode; children: ReactNode }) {
  return (
    <Tag accent={TONE_TO_TAG[tone]}>
      {icon}
      {children}
    </Tag>
  );
}
