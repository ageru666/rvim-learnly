import { expect, test } from '@playwright/test';
import { publishCourse } from './helpers/api';
import { translatorFor, uniqueEmail } from './helpers/i18n';
import { latestEmail, linkFrom } from './helpers/mailpit';

const QUESTIONS = [
  { text: 'What stores a value?', correct: 'A variable', wrong: 'A comment' },
  { text: 'Which keyword declares a constant?', correct: 'const', wrong: 'loop' },
];

test('a student completes a course, gets a certificate and reviews the course', async ({ page, request, browser }, testInfo) => {
  const i18n = translatorFor(testInfo);
  const { t } = i18n;
  const course = await publishCourse(request, QUESTIONS);
  const [, , quizLesson] = course.lessons;

  // A new student with a verified email (BR-U4 for reviews); the session cookies land in the browser.
  const email = uniqueEmail('complete');
  const registered = await page.request.post('/api/v1/auth/register', {
    data: { name: 'E2E Finisher', email, password: 'Passw0rd!e2e', acceptTerms: true },
  });
  expect(registered.status()).toBe(201);
  await page.goto(linkFrom(await latestEmail(email), '/verify-email?token='));

  await page.goto(`/courses/${course.slug}`);
  await page.locator('#main').getByRole('button', { name: t('site.course.enroll') }).click();
  await expect(page).toHaveURL(new RegExp(`/app/learn/${course.id}/${course.lessons[0]?.id}$`));

  for (const lesson of course.lessons.slice(0, 2)) {
    await expect(page.getByRole('heading', { level: 1, name: lesson.title })).toBeVisible();
    await page.getByRole('button', { name: t('app.player.markComplete') }).click();
    await expect(page.getByRole('button', { name: t('app.player.markIncomplete') })).toBeVisible();
    await page.getByRole('link', { name: t('app.player.next') }).click();
  }

  await expect(page.getByRole('heading', { level: 1, name: quizLesson?.title })).toBeVisible();
  await page.getByRole('button', { name: t('app.quiz.start') }).click();

  // The answer survives a reload (FR-LEARN-7: the unfinished quiz is kept on this device).
  await page.getByRole('radio', { name: QUESTIONS[0]?.correct }).check();
  await page.reload();
  await expect(page.getByRole('button', { name: i18n.translate('app.quiz.answered', { number: 1 }) })).toBeVisible();
  await expect(page.getByRole('radio', { name: QUESTIONS[0]?.correct })).toBeChecked();

  // First attempt: the second answer is wrong, so the 100 % pass score is missed.
  await page.getByRole('button', { name: t('app.quiz.next') }).click();
  await page.getByRole('radio', { name: QUESTIONS[1]?.wrong }).check();
  await page.getByRole('button', { name: t('app.quiz.finish') }).click();
  await expect(page.getByText(t('app.quiz.failed'))).toBeVisible();
  await expect(page.getByText(t('app.quiz.answersHidden'))).toBeVisible();

  await page.getByRole('button', { name: t('app.quiz.retry') }).click();
  await page.getByRole('radio', { name: QUESTIONS[0]?.correct }).check();
  await page.getByRole('button', { name: t('app.quiz.next') }).click();
  await page.getByRole('radio', { name: QUESTIONS[1]?.correct }).check();
  await page.getByRole('button', { name: t('app.quiz.finish') }).click();

  // Passing the last lesson completes the course and opens the congratulations page.
  await expect(page).toHaveURL(new RegExp(`/app/learn/${course.id}/completed$`));
  await expect(page.getByRole('heading', { name: t('app.completed.title') })).toBeVisible();
  const certificateUrl = await page.getByRole('link', { name: t('app.completed.certificate') }).getAttribute('href');
  expect(certificateUrl).toMatch(/\/certificates\/[\w-]+$/);

  // Anyone with the link can verify the certificate, without an account.
  const guest = await browser.newContext({ locale: testInfo.project.use.locale });
  const guestPage = await guest.newPage();
  await guestPage.goto(new URL(certificateUrl ?? '', page.url()).toString());
  await expect(guestPage.getByText('E2E Finisher')).toBeVisible();
  await expect(guestPage.getByText(course.title)).toBeVisible();
  await guest.close();

  await page.getByRole('link', { name: t('app.completed.review') }).click();
  await expect(page).toHaveURL(new RegExp(`/courses/${course.slug}#reviews$`));
  // The radio is visually hidden; a person clicks its star, the label around it.
  const fiveStars = page.getByRole('radio', { name: i18n.translate('site.course.reviewForm.star', { count: 5 }) });
  await page.locator('label').filter({ has: fiveStars }).click();
  await expect(fiveStars).toBeChecked();
  await page.getByLabel(t('site.course.reviewForm.text')).fill('Short, clear and the quiz checks the right things.');
  await page.getByRole('button', { name: t('site.course.reviewForm.submit') }).click();
  await expect(page.getByText(t('site.course.reviewForm.saved'))).toBeVisible();
});
