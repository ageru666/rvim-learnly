import { join } from 'node:path';
import type { Locale } from '@learnly/contracts/enums';
import type { MessageKey } from '@learnly/i18n/keys';
import ejs from 'ejs';
import nodemailer from 'nodemailer';
import { config, SERVER_ROOT } from '../config/env.js';
import { translatorFor } from './i18n.js';
import { logger } from './logger.js';

const EMAIL_VIEWS = join(SERVER_ROOT, 'src', 'views', 'emails');

/** No transport without SMTP_HOST: a public demo server logs that an email was not sent instead. */
const transport = config.SMTP_HOST
  ? nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: false })
  : null;

export interface EmailMessage {
  to: string;
  /** The recipient's locale (users.locale), not the locale of whoever triggered the email. */
  locale: Locale;
  /** File name in views/emails without the extension. */
  template: string;
  subjectKey: MessageKey;
  data?: Record<string, unknown>;
}

async function send(message: EmailMessage): Promise<void> {
  if (!transport) {
    logger.info({ template: message.template, locale: message.locale }, 'email not sent: no SMTP server configured');
    return;
  }
  const i18n = translatorFor(message.locale);
  const html = await ejs.renderFile(join(EMAIL_VIEWS, `${message.template}.ejs`), {
    ...message.data,
    t: i18n.t,
    locale: message.locale,
    appUrl: config.APP_URL,
  });
  await transport.sendMail({
    from: config.MAIL_FROM,
    to: message.to,
    subject: i18n.translate(message.subjectKey),
    html,
  });
}

/**
 * Sends an email after the business transaction has committed. A delivery failure is logged and
 * never undoes the action that triggered the email.
 */
export async function deliverEmail(message: EmailMessage): Promise<void> {
  try {
    await send(message);
  } catch (error) {
    logger.error({ err: error, template: message.template }, 'email delivery failed');
  }
}
