import { pageSchema, type Page } from '@learnly/contracts/common';
import { notificationSchema, unreadCountSchema, type NotificationDto } from '@learnly/contracts/notifications';
import { baseApi } from '../../shared/api/baseApi';

const PAGE_SIZE = 20;
const notificationsPageSchema = pageSchema(notificationSchema);

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUnreadCount: build.query<number, void>({
      query: () => '/me/notifications/unread-count',
      transformResponse: (response: unknown) => unreadCountSchema.parse(response).count,
      providesTags: ['Notifications'],
    }),
    getNotifications: build.infiniteQuery<Page<NotificationDto>, void, number>({
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage) => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
      },
      query: ({ pageParam }) => ({ url: '/me/notifications', params: { page: pageParam, limit: PAGE_SIZE } }),
      transformResponse: (response: unknown) => notificationsPageSchema.parse(response),
      providesTags: ['Notifications', 'Locale'],
    }),
    /** Optimistic: the item looks read and the counter drops at once; an error puts them back. */
    markNotificationRead: build.mutation<null, string>({
      query: (id) => ({ url: `/me/notifications/${id}/read`, method: 'POST' }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const list = dispatch(
          notificationsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            for (const page of draft.pages) for (const item of page.items) if (item.id === id) item.read = true;
          }),
        );
        const count = dispatch(notificationsApi.util.updateQueryData('getUnreadCount', undefined, (draft) => Math.max(0, draft - 1)));
        try {
          await queryFulfilled;
        } catch {
          list.undo();
          count.undo();
        }
      },
      invalidatesTags: ['Dashboard'],
    }),
    markAllNotificationsRead: build.mutation<null, void>({
      query: () => ({ url: '/me/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notifications', 'Dashboard'],
    }),
  }),
});

export const {
  useGetUnreadCountQuery,
  useGetNotificationsInfiniteQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
