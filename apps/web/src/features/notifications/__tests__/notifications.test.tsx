import { NOTIFICATION_TYPES } from '@learnly/contracts/enums';
import type { NotificationDto } from '@learnly/contracts/notifications';
import { en } from '@learnly/i18n/messages/en';
import { uk } from '@learnly/i18n/messages/uk';
import { createTranslator } from '@learnly/i18n/translator';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { NotificationBell } from '../NotificationBell';
import { NotificationsPage } from '../NotificationsPage';
import { linkTarget, notificationMessage } from '../utils';

const PAYLOAD = { courseTitle: 'Основи JavaScript', comment: 'Додайте приклади' };

describe('notification utils', () => {
  it('writes a message for every type in both languages', () => {
    for (const [locale, messages] of [['uk', uk], ['en', en]] as const) {
      const i18n = createTranslator(locale, messages);
      for (const type of NOTIFICATION_TYPES) {
        const text = notificationMessage(type, PAYLOAD, i18n);
        expect(text.length, `${locale}:${type}`).toBeGreaterThan(5);
        expect(text).not.toContain('{');
      }
    }
    const i18n = createTranslator('en', en);
    expect(notificationMessage('course_rejected', PAYLOAD, i18n)).toContain('Основи JavaScript');
    expect(notificationMessage('course_rejected', {}, i18n)).not.toContain('undefined');
  });

  it('keeps dashboard links inside the SPA', () => {
    expect(linkTarget('/app/teach/reviews')).toEqual({ kind: 'app', to: '/teach/reviews' });
    expect(linkTarget('/app')).toEqual({ kind: 'app', to: '/' });
    expect(linkTarget('/courses/js#reviews')).toEqual({ kind: 'site', href: '/courses/js#reviews' });
    expect(linkTarget('/application')).toEqual({ kind: 'site', href: '/application' });
  });
});

function notification(index: number, read: boolean): NotificationDto {
  return {
    id: `01970000-0000-7000-8000-0000000a000${index}`,
    type: 'course_approved',
    payload: { courseTitle: `Курс ${index}`, courseSlug: `course-${index}` },
    read,
    createdAt: '2026-10-20T10:00:00.000Z',
    link: `/courses/course-${index}`,
  };
}

describe('NotificationBell and NotificationsPage', () => {
  it('shows the unread count as text and resets it after "mark all as read"', async () => {
    document.cookie = 'locale=uk; path=/';
    let unread = 2;
    server.use(
      http.get(`${config.apiBaseUrl}/me/notifications/unread-count`, () => HttpResponse.json({ count: unread })),
      http.get(`${config.apiBaseUrl}/me/notifications`, () =>
        HttpResponse.json({ items: [notification(1, unread === 0), notification(2, true)], page: 1, limit: 20, total: 2 }),
      ),
      http.post(`${config.apiBaseUrl}/me/notifications/read-all`, () => {
        unread = 0;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithStore(
      <>
        <NotificationBell />
        <NotificationsPage />
      </>,
    );

    expect(await screen.findByRole('link', { name: 'Сповіщення: 2 непрочитані' })).toBeInTheDocument();
    expect(await screen.findByText('Курс «Курс 1» схвалено та опубліковано.')).toBeInTheDocument();
    expect(screen.getByText('Нове')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Позначити всі прочитаними' }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'Сповіщення' })).toBeInTheDocument());
    expect(screen.queryByText('Нове')).not.toBeInTheDocument();
  });

  it('marks a notification as read when it is opened', async () => {
    document.cookie = 'locale=uk; path=/';
    let read: string | null = null;
    server.use(
      http.get(`${config.apiBaseUrl}/me/notifications`, () => HttpResponse.json({ items: [notification(1, false)], page: 1, limit: 20, total: 1 })),
      http.post(`${config.apiBaseUrl}/me/notifications/:id/read`, ({ params }) => {
        read = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithStore(<NotificationsPage />);
    const link = await screen.findByRole('link', { name: /Курс «Курс 1»/ });
    link.addEventListener('click', (event) => event.preventDefault());
    await userEvent.click(link);
    await waitFor(() => expect(read).toBe(notification(1, false).id));
    await waitFor(() => expect(screen.queryByText('Нове')).not.toBeInTheDocument());
  });
});
