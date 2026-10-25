import type { NotificationDto } from '@learnly/contracts/notifications';
import { Link } from 'react-router';
import { Card } from '../../shared/components/Card';
import { useT } from '../locale/useT';
import { NotificationItem } from './components/NotificationItem';

/** The dashboard block with the five latest notifications (FR-LEARN-2). */
export function NotificationsBlock({ notifications }: { notifications: NotificationDto[] }) {
  const { t } = useT();
  if (notifications.length === 0) return null;
  return (
    <section className="flex flex-col gap-4" aria-labelledby="notifications-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="notifications-heading" className="heading-lg">
          {t('app.notificationsPage.dashboardHeading')}
        </h2>
        <Link to="/notifications" className="link text-sm">
          {t('app.notificationsPage.all')}
        </Link>
      </div>
      <Card className="flex flex-col p-2">
        <ul className="flex flex-col">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem notification={notification} compact />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
