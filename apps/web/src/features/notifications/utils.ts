import type { NotificationType } from '@learnly/contracts/enums';
import type { NotificationPayload } from '@learnly/contracts/notifications';
import type { Translator } from '@learnly/i18n/translator';

const APP_PREFIX = '/app';

/** The notification text in the viewer's current language (rendered at display time, FR-I18N-4). */
export function notificationMessage(type: NotificationType, payload: NotificationPayload, i18n: Translator): string {
  return i18n.translate(`notifications.${type}`, { courseTitle: payload.courseTitle ?? '', comment: payload.comment ?? '' });
}

/** `/app/...` links stay inside the SPA (router path without the base); others leave it. */
export function linkTarget(link: string): { kind: 'app'; to: string } | { kind: 'site'; href: string } {
  if (link === APP_PREFIX || link.startsWith(`${APP_PREFIX}/`)) return { kind: 'app', to: link.slice(APP_PREFIX.length) || '/' };
  return { kind: 'site', href: link };
}
