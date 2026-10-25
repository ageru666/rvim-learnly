import { Bell } from 'lucide-react';
import { Link } from 'react-router';
import { useT } from '../locale/useT';
import { NOTIFICATIONS_POLL_MS } from '@learnly/contracts/limits';
import { useGetUnreadCountQuery } from './notificationsApi';

const MAX_SHOWN = 99;

/** The unread counter, refreshed every minute and on focus; the number is also in the accessible name. */
export function NotificationBell() {
  const { t } = useT();
  const { data: count = 0 } = useGetUnreadCountQuery(undefined, { pollingInterval: NOTIFICATIONS_POLL_MS, refetchOnFocus: true });
  const label = count > 0 ? `${t('site.header.notifications')}: ${t('site.header.unread', { count })}` : t('site.header.notifications');
  return (
    <Link to="/notifications" className="btn btn-ghost btn-icon relative" aria-label={label} title={label}>
      <Bell aria-hidden size={18} />
      {count > 0 && (
        <span aria-hidden className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-pill bg-accent-red px-1 text-xs font-bold text-on-primary">
          {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
        </span>
      )}
    </Link>
  );
}
