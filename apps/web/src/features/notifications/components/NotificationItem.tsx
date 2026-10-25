import type { NotificationDto } from '@learnly/contracts/notifications';
import { Link } from 'react-router';
import { Badge } from '../../../shared/components/Badge';
import { cx } from '../../../shared/utils/cx';
import { useFormat } from '../../locale/useFormat';
import { useT } from '../../locale/useT';
import { useMarkNotificationReadMutation } from '../notificationsApi';
import { linkTarget, notificationMessage } from '../utils';

/** Opening a notification marks it as read. */
export function NotificationItem({ notification, compact = false }: { notification: NotificationDto; compact?: boolean }) {
  const i18n = useT();
  const format = useFormat();
  const [markRead] = useMarkNotificationReadMutation();
  const target = linkTarget(notification.link);
  const onOpen = () => {
    if (!notification.read) void markRead(notification.id);
  };
  const text = notificationMessage(notification.type, notification.payload, i18n);
  const className = cx('focus-ring flex flex-col gap-1 rounded-md p-3 hover:bg-surface-hover', !notification.read && 'bg-surface-selected', compact ? 'text-sm' : '');

  const content = (
    <>
      <span className="flex items-start gap-2">
        {!notification.read && <Badge tone="info">{i18n.t('app.notificationsPage.unread')}</Badge>}
        <span className={cx(!notification.read && 'font-semibold')}>{text}</span>
      </span>
      <span className="text-xs text-text-muted">{format.date(notification.createdAt, 'dateTime')}</span>
    </>
  );

  return target.kind === 'app' ? (
    <Link to={target.to} className={className} onClick={onOpen}>
      {content}
    </Link>
  ) : (
    <a href={target.href} className={className} onClick={onOpen}>
      {content}
    </a>
  );
}
