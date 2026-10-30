import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { Skeleton } from '../../shared/components/Skeleton';
import { VirtualList } from '../../shared/components/VirtualList';
import { useT } from '../locale/useT';
import { QueryErrorState } from '../navigation/QueryErrorState';
import { NotificationItem } from './components/NotificationItem';
import { useGetNotificationsInfiniteQuery, useMarkAllNotificationsReadMutation } from './notificationsApi';

const ROW_HEIGHT = 80;

/** `/app/notifications`. */
export function NotificationsPage() {
  const i18n = useT();
  const { t } = i18n;
  const query = useGetNotificationsInfiniteQuery();
  const [markAll, { isLoading }] = useMarkAllNotificationsReadMutation();
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const hasUnread = items.some((item) => !item.read);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="heading-xl">{t('app.notificationsPage.title')}</h1>
        {hasUnread && (
          <Button variant="outline" loading={isLoading} onClick={() => void markAll()}>
            <CheckCheck aria-hidden size={16} />
            {t('app.notificationsPage.markAll')}
          </Button>
        )}
      </div>
      {query.isLoading && <Skeleton className="h-48" />}
      {query.error && (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      )}
      {query.data && items.length === 0 && <EmptyState icon={<Bell aria-hidden size={40} />} title={t('app.notificationsPage.empty')} />}
      {items.length > 0 && (
        <VirtualList
          items={items}
          itemKey={(item) => item.id}
          renderItem={(item) => <NotificationItem notification={item} />}
          estimateSize={ROW_HEIGHT}
          label={t('app.notificationsPage.listLabel')}
          total={query.data?.pages[0]?.total ?? 0}
          hasMore={query.hasNextPage}
          isFetchingMore={query.isFetchingNextPage}
          onEndReached={() => void query.fetchNextPage()}
        />
      )}
    </div>
  );
}
