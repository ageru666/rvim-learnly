import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { logIn, signUpVerified } from './helpers/accounts';
import { DEMO } from './helpers/api';
import { translatorFor, uniqueEmail } from './helpers/i18n';

const COVER = resolve(import.meta.dirname, '../../../docs/api/fixtures/cover.png');
const SHORT = 'Programming basics in three short lessons.';
const DRAFT = 'Programming basics in three short, practical lessons.';

/** Opens the admin page of the item in the list entry that mentions `text`. */
async function openAdminItem(page: Page, listUrl: string, text: string, openLabel: string) {
  await page.goto(listUrl);
  await page.getByRole('listitem').filter({ hasText: text }).getByRole('link', { name: openLabel }).click();
}

/** Submits an admin decision and waits for the redirect back to the list. */
async function decide(page: Page, button: string, listUrl: string) {
  await page.getByRole('button', { name: button }).click();
  await expect(page).toHaveURL(new RegExp(`${listUrl}$`));
}

test('an applicant becomes an instructor and publishes a course after moderation', async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const i18n = translatorFor(testInfo);
  const { t } = i18n;
  const locale = testInfo.project.use.locale;
  const email = uniqueEmail('teacher');
  const title = `Course by e2e ${Date.now()}`;

  const applicantContext = await browser.newContext({ locale });
  const applicant = await applicantContext.newPage();
  const adminContext = await browser.newContext({ locale });
  const admin = await adminContext.newPage();

  // 1. The application and its approval.
  await signUpVerified(applicant, email, 'E2E Teacher');
  await applicant.goto('/teach');
  await applicant
    .getByLabel(t('site.teach.motivation'))
    .fill('I have taught programming to beginners for five years and want to publish practical courses here.');
  await applicant.getByRole('button', { name: t('site.teach.submit') }).click();
  await expect(applicant.getByText(t('site.teach.sent'))).toBeVisible();

  await logIn(admin, t, DEMO.admin);
  await openAdminItem(admin, '/admin/applications', email, t('admin.common.open'));
  await decide(admin, t('admin.applications.approve'), '/admin/applications');

  // 2. The new instructor creates the course.
  await applicant.goto('/app/teach');
  await applicant.getByRole('button', { name: t('app.teach.create') }).first().click();
  const dialog = applicant.getByRole('dialog');
  await dialog.getByLabel(t('app.teach.createDialog.courseTitle')).fill(title);
  await dialog.getByLabel(t('app.teach.createDialog.category')).click();
  await applicant.getByRole('option').first().click();
  await dialog.getByRole('button', { name: t('app.teach.createDialog.submit') }).click();
  await expect(applicant.getByRole('tab', { name: t('app.teach.editor.basics') })).toBeVisible();
  const editorUrl = applicant.url();

  await applicant.getByLabel(t('app.teach.basics.shortDescription')).fill(SHORT);
  await applicant.getByLabel(t('app.teach.basics.description')).fill('Variables, functions and loops with examples.');
  for (const [index, outcome] of ['Write a function', 'Use a loop'].entries()) {
    await applicant.getByRole('button', { name: t('app.teach.basics.addItem') }).first().click();
    await applicant.getByLabel(i18n.translate('app.teach.basics.item', { number: index + 1 })).first().fill(outcome);
  }
  await applicant.getByRole('button', { name: t('app.teach.basics.save') }).click();
  await expect(applicant.getByText(t('app.teach.basics.saved'))).toBeVisible();
  await applicant.getByLabel(t('app.teach.basics.uploadCover')).setInputFiles(COVER);
  await expect(applicant.locator('img[src^="/uploads/covers/"]')).toBeVisible();

  // 3. The curriculum, reordered with keyboard drag and drop (the dnd-kit keyboard sensor).
  await applicant.getByRole('tab', { name: t('app.teach.editor.curriculum') }).click();
  await applicant.getByRole('button', { name: t('app.curriculum.addModule') }).click();
  await dialog.getByLabel(t('app.curriculum.moduleTitle')).fill('Basics');
  await dialog.getByRole('button', { name: t('app.curriculum.save') }).click();
  await expect(applicant.getByText('Basics', { exact: true })).toBeVisible();
  for (const lesson of ['Functions', 'Variables', 'Loops']) {
    await applicant.getByRole('button', { name: t('app.curriculum.addLesson') }).click();
    await dialog.getByLabel(t('app.curriculum.lessonTitle')).fill(lesson);
    await dialog.getByRole('button', { name: t('app.curriculum.save') }).click();
    await expect(applicant.getByText(lesson, { exact: true })).toBeVisible();
  }
  // The new order is saved as soon as the lesson is dropped.
  const structureSaved = applicant.waitForResponse(
    (response) => response.url().endsWith('/structure') && response.request().method() === 'PUT',
  );
  await applicant.getByRole('button', { name: i18n.translate('app.curriculum.dragHandle', { title: 'Variables' }) }).focus();
  await applicant.keyboard.press('Space');
  await applicant.keyboard.press('ArrowUp');
  await applicant.keyboard.press('Space');
  expect((await structureSaved).ok()).toBe(true);
  await applicant.reload();
  await applicant.getByRole('tab', { name: t('app.teach.editor.curriculum') }).click();
  const lessonNames = applicant.getByText(/^(Variables|Functions|Loops)$/);
  await expect(lessonNames).toHaveText(['Variables', 'Functions', 'Loops']);

  // 4. The tab closes in the middle of an edit; the draft on this device is offered back.
  await applicant.goto(editorUrl);
  await applicant.getByLabel(t('app.teach.basics.shortDescription')).fill(DRAFT);
  const autosaved = i18n.translate('app.teach.draft.autosaved', { time: '' }).trim();
  await expect(applicant.getByText(autosaved, { exact: false })).toBeVisible();
  await applicant.close();

  const reopened = await applicantContext.newPage();
  await reopened.goto(editorUrl);
  await reopened.getByRole('button', { name: t('app.teach.draft.restore') }).click();
  await expect(reopened.getByLabel(t('app.teach.basics.shortDescription'))).toHaveValue(DRAFT);
  await reopened.getByRole('button', { name: t('app.teach.basics.save') }).click();
  await expect(reopened.getByText(t('app.teach.basics.saved'))).toBeVisible();

  // 5. Moderation: rejected with a reason, submitted again, then approved.
  await reopened.getByRole('tab', { name: t('app.teach.editor.publish') }).click();
  await reopened.getByRole('button', { name: t('app.teach.publish.submit') }).click();
  await expect(reopened.getByText(t('app.teach.publish.inReviewHint'), { exact: true })).toBeVisible();

  const reason = 'Please describe what students will build in the description.';
  await openAdminItem(admin, '/admin/courses/moderation', title, t('admin.common.open'));
  await admin.getByLabel(t('admin.common.reason')).first().fill(reason);
  await decide(admin, t('admin.courses.reject'), '/admin/courses/moderation');

  await reopened.reload();
  await reopened.getByRole('tab', { name: t('app.teach.editor.publish') }).click();
  await expect(reopened.getByText(reason)).toBeVisible();
  await reopened.getByRole('button', { name: t('app.teach.publish.submit') }).click();
  await expect(reopened.getByText(t('app.teach.publish.inReviewHint'), { exact: true })).toBeVisible();

  await openAdminItem(admin, '/admin/courses/moderation', title, t('admin.common.open'));
  await decide(admin, t('admin.courses.approve'), '/admin/courses/moderation');

  // 6. The course is in the catalog for everyone, and every decision is in the audit log.
  const guest = await browser.newContext({ locale });
  const guestPage = await guest.newPage();
  await guestPage.goto(`/courses?search=${encodeURIComponent(title)}`);
  await expect(guestPage.getByRole('link', { name: title }).first()).toBeVisible();

  await admin.goto('/admin/audit-log');
  for (const entry of ['admin.audit.course.approve', 'admin.audit.course.reject', 'admin.audit.application.approve'] as const) {
    await expect(admin.getByRole('cell', { name: t(entry), exact: true }).first()).toBeVisible();
  }
  await Promise.all([guest.close(), adminContext.close(), applicantContext.close()]);
});
