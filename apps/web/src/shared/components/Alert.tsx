import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../utils/cx';

export type AlertKind = 'info' | 'success' | 'warning' | 'error';

const ALERT_ICONS: Record<AlertKind, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
};

interface AlertProps {
  kind: AlertKind;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function Alert({ kind, title, children, action }: AlertProps) {
  const Icon = ALERT_ICONS[kind];
  return (
    <div className={cx('alert', `alert-${kind}`)} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden size={18} className="mt-0.5" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
      {action}
    </div>
  );
}
