import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { logIn, NEW_PASSWORD, signUpVerified } from './helpers/accounts';
import { bearer, DEMO, publishCourse, type PublishedCourse } from './helpers/api';
import { translatorFor, uniqueEmail } from './helpers/i18n';
import { BASE_URL } from './playwright.config';

const THEMES = ['light', 'dark'] as const;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING = new Set(['serious', 'critical']);

/** Serious and critical axe violations of the page, in both themes, as readable lines. */
async function violationsIn(page: Page, context: BrowserContext, url: string): Promise<string[]> {
  const found: string[] = [];
  for (const theme of THEMES) {
    await context.addCookies([{ name: 'theme', value: theme, url: BASE_URL }]);
    await page.goto(url);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    for (const violation of violations.filter((item) => BLOCKING.has(item.impact ?? ''))) {
      const targets = violation.nodes.map((node) => node.html.slice(0, 160)).join(' | ');
      found.push(`[${theme}] ${url}: ${violation.id} (${violation.impact}) ${targets}`);
    }
  }
  return found;
}

/** A context in the project's language: the cookie wins over the language of the seeded accounts. */
async function newContext(browser: import('@playwright/test').Browser, locale: string) {
  const context = await browser.newContext({ locale });
  await context.addCookies([{ name: 'locale', value: locale.slice(0, 2), url: BASE_URL }]);
  return context;
}

let course: PublishedCourse;

test.beforeAll(async ({ request }) => {
  course = await publishCourse(request, [{ text: 'What stores a value?', correct: 'A variable', wrong: 'A comment' }]);
});

test('public and admin pages have no serious accessibility violations @both', async ({ browser }, testInfo) => {
  const { t } = translatorFor(testInfo);
  const context = await newContext(browser, testInfo.project.use.locale ?? 'uk-UA');
  const page = await context.newPage();
  const found: string[] = [];
  for (const url of ['/', '/courses', `/courses/${course.slug}`, '/login']) {
    found.push(...(await violationsIn(page, context, url)));
  }
  await logIn(page, t, DEMO.admin);
  found.push(...(await violationsIn(page, context, '/admin')));
  expect(found).toEqual([]);
  await context.close();
});

test('learning and teaching screens have no serious accessibility violations @both', async ({ browser }, testInfo) => {
  const { t } = translatorFor(testInfo);
  const locale = testInfo.project.use.locale ?? 'uk-UA';
  const [firstLesson, , quizLesson] = course.lessons;

  const student = await newContext(browser, locale);
  const studentPage = await student.newPage();
  const email = uniqueEmail('a11y');
  await signUpVerified(studentPage, email, 'E2E Reader');
  const enrolled = await studentPage.request.post(`/api/v1/courses/${course.id}/enrollment`, {
    headers: await bearer(studentPage.request, email, NEW_PASSWORD),
  });
  expect(enrolled.ok()).toBe(true);

  const found: string[] = [];
  for (const url of ['/app', `/app/learn/${course.id}/${firstLesson?.id}`, `/app/learn/${course.id}/${quizLesson?.id}`]) {
    found.push(...(await violationsIn(studentPage, student, url)));
  }
  // The quiz in progress, not only its start screen.
  await studentPage.getByRole('button', { name: t('app.quiz.start') }).click();
  await expect(studentPage.getByRole('radio').first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page: studentPage }).withTags(WCAG_TAGS).analyze();
  found.push(...violations.filter((item) => BLOCKING.has(item.impact ?? '')).map((item) => `[quiz] ${item.id} (${item.impact})`));
  await student.close();

  const instructor = await newContext(browser, locale);
  const instructorPage = await instructor.newPage();
  await logIn(instructorPage, t, DEMO.instructor);
  found.push(...(await violationsIn(instructorPage, instructor, `/app/teach/courses/${course.id}`)));
  await instructor.close();

  expect(found).toEqual([]);
});
