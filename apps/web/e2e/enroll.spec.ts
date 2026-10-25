import { expect, test } from '@playwright/test';
import { translatorFor, uniqueEmail } from './helpers/i18n';
import { latestEmail, linkFrom } from './helpers/mailpit';

test('a guest finds a course, enrolls, signs up and verifies the email @both', async ({ page }, testInfo) => {
  const { t } = translatorFor(testInfo);
  const email = uniqueEmail('enroll');

  await page.goto('/courses');
  await page.getByLabel(t('site.catalog.level')).selectOption('beginner');
  await page.getByRole('button', { name: t('site.catalog.apply') }).click();
  await expect(page).toHaveURL(/level=beginner/);

  await page.locator('main article a').first().click();
  await expect(page).toHaveURL(/\/courses\/[\w-]+$/);
  await page.getByRole('button', { name: t('site.course.enroll') }).click();

  await expect(page).toHaveURL(/\/login\?/);
  await page.locator('#main').getByRole('link', { name: t('site.auth.login.registerLink') }).click();
  await page.getByLabel(t('site.auth.register.name')).fill('E2E Student');
  await page.getByLabel(t('site.auth.register.email')).fill(email);
  await page.getByLabel(t('site.auth.register.password'), { exact: true }).fill('Passw0rd!e2e');
  await page.getByLabel(t('site.auth.register.passwordConfirm')).fill('Passw0rd!e2e');
  await page.getByLabel(t('site.auth.register.acceptTerms')).check();
  await page.locator('#main').getByRole('button', { name: t('site.auth.register.submit') }).click();

  await expect(page).toHaveURL(/\/app\/learn\/[\w-]+\/[\w-]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const lessonUrl = page.url();

  const verifyPath = linkFrom(await latestEmail(email), '/verify-email?token=');
  await page.goto(verifyPath);
  await expect(page.getByText(t('site.auth.verify.successHeading'))).toBeVisible();

  await page.goto(lessonUrl);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(t('common.verifyBanner.text'))).toHaveCount(0);
});
