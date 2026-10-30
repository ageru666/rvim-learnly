import { expect, test, type Browser, type Page } from '@playwright/test';
import { logIn, NEW_PASSWORD, signUpVerified } from './helpers/accounts';
import { DEMO } from './helpers/api';
import { translatorOf, uniqueEmail } from './helpers/i18n';
import { latestEmail } from './helpers/mailpit';

const uk = translatorOf('uk');
const en = translatorOf('en');

async function newPage(browser: Browser, locale: string): Promise<Page> {
  return (await browser.newContext({ locale })).newPage();
}

/** The header switcher of the SSR pages and the admin panel (the footer repeats it). */
async function switchTo(page: Page, language: string) {
  await page.getByRole('banner').getByRole('button', { name: language }).click();
}

test('the browser language is the default and a choice on the site follows the visitor', async ({ browser }) => {
  const english = await newPage(browser, 'en-GB');
  await english.goto('/');
  await expect(english.locator('html')).toHaveAttribute('lang', 'en');

  const guest = await newPage(browser, 'uk-UA');
  await guest.goto('/');
  await expect(guest.locator('html')).toHaveAttribute('lang', 'uk');
  await switchTo(guest, uk.t('site.locale.native.en'));
  await expect(guest.locator('html')).toHaveAttribute('lang', 'en');
  await guest.goto('/courses');
  await expect(guest.locator('html')).toHaveAttribute('lang', 'en');

  // US4: the catalog lists only English-language courses with the language filter.
  await guest.getByLabel(en.t('site.catalog.language')).selectOption('en');
  await guest.getByRole('button', { name: en.t('site.catalog.apply') }).click();
  await expect(guest).toHaveURL(/language=en/);
  const titles = guest.locator('#main a[href^="/courses/"][lang]');
  await expect(titles.first()).toBeVisible();
  for (const language of await titles.evaluateAll((links) => links.map((link) => link.getAttribute('lang')))) {
    expect(language).toBe('en');
  }
  await Promise.all([english.context().close(), guest.context().close()]);
});

test('the admin panel switches its language', async ({ browser }) => {
  const admin = await newPage(browser, 'uk-UA');
  await logIn(admin, uk.t, DEMO.admin);
  await admin.goto('/admin');
  await switchTo(admin, uk.t('site.locale.native.en'));
  await expect(admin.locator('html')).toHaveAttribute('lang', 'en');
  await admin.goto('/admin/users');
  await expect(admin.getByRole('heading', { level: 1, name: en.t('admin.panel.users') })).toBeVisible();
  // The choice is saved to the seeded admin account: restore it for the other scenarios.
  await switchTo(admin, en.t('site.locale.native.uk'));
  await expect(admin.locator('html')).toHaveAttribute('lang', 'uk');
  await admin.context().close();
});

test('the language chosen in the dashboard is kept by the account: other devices and emails follow it', async ({ browser }) => {
  const email = uniqueEmail('locale');
  const student = await newPage(browser, 'uk-UA');
  await signUpVerified(student, email, 'E2E Polyglot');

  await student.goto('/app');
  const name = 'E2E Polyglot';
  await expect(student.getByRole('heading', { name: uk.translate('app.dashboard.greeting', { name }) })).toBeVisible();
  const saved = student.waitForResponse((response) => response.url().endsWith('/api/v1/me') && response.request().method() === 'PATCH');
  await student.getByRole('banner').getByRole('button', { name: uk.t('site.locale.native.en') }).click();
  await expect(student.getByRole('heading', { name: en.translate('app.dashboard.greeting', { name }) })).toBeVisible();
  expect((await saved).ok()).toBe(true);
  await expect(student.locator('html')).toHaveAttribute('lang', 'en');
  await student.goto('/courses');
  await expect(student.locator('html')).toHaveAttribute('lang', 'en');

  // A new device with a Ukrainian browser: after logging in, the account language wins over Accept-Language.
  const otherDevice = await newPage(browser, 'uk-UA');
  await logIn(otherDevice, uk.t, email, NEW_PASSWORD);
  await otherDevice.goto('/app');
  await expect(otherDevice.getByRole('heading', { name: en.translate('app.dashboard.greeting', { name }) })).toBeVisible();

  // Emails are written in the account language, whatever the language of the request.
  const anonymous = await newPage(browser, 'uk-UA');
  await anonymous.goto('/forgot-password');
  await anonymous.locator('#main').getByLabel(uk.t('site.auth.forgot.email')).fill(email);
  await anonymous.getByRole('button', { name: uk.t('site.auth.forgot.submit') }).click();
  const reset = await latestEmail(email, en.t('emails.passwordReset.subject'));
  expect(reset.html).toContain(en.t('emails.passwordReset.action'));

  await Promise.all([student.context().close(), otherDevice.context().close(), anonymous.context().close()]);
});
