import { expect, type BrowserContext, type Page } from '@playwright/test';
import type { Translator } from '../../../../packages/i18n/src/translator';
import { BASE_URL } from '../playwright.config';
import { DEMO_PASSWORD, languageOf } from './i18n';
import { latestEmail, linkFrom } from './mailpit';

export const NEW_PASSWORD = 'Passw0rd!e2e';

/** Signs up through the API (the cookies land in the page's context) and follows the verification email. */
export async function signUpVerified(page: Page, email: string, name: string): Promise<void> {
  const response = await page.request.post('/api/v1/auth/register', {
    data: { name, email, password: NEW_PASSWORD, acceptTerms: true },
  });
  expect(response.status()).toBe(201);
  await page.goto(linkFrom(await latestEmail(email), '/verify-email?token='));
}

/** Logs in through the site's form, the way a person does. */
export async function logIn(page: Page, t: Translator['t'], email: string, password = DEMO_PASSWORD): Promise<void> {
  await page.goto('/login');
  const form = page.locator('#main');
  await form.getByLabel(t('site.auth.login.email')).fill(email);
  await form.getByLabel(t('site.auth.login.password'), { exact: true }).fill(password);
  await form.getByRole('button', { name: t('site.auth.login.submit') }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/**
 * Sets the interface language of the context. Logging in resets the cookie to the account language, so the
 * scenarios that check a screen in the project language call this again after signing in.
 */
export async function preferLanguage(context: BrowserContext, locale: string): Promise<void> {
  await context.addCookies([{ name: 'locale', value: languageOf(locale), url: BASE_URL }]);
}
