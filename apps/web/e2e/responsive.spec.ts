import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { logIn, preferLanguage } from './helpers/accounts';
import { DEMO } from './helpers/api';
import { languageOf, translatorFor } from './helpers/i18n';
import { BASE_URL } from './playwright.config';

/** SC-007: phone, tablet, laptop and desktop widths. */
const WIDTHS = [360, 768, 1024, 1440];
const HEIGHT = 800;
const THEMES = ['light', 'dark'] as const;
const STUDENT = 'student1@learnly.local';

const PUBLIC_PAGES = ['/', '/courses', '/login', '/register', '/forgot-password', '/teach', '/about', '/faq', '/terms', '/privacy', '/contacts'];
const ADMIN_PAGES = [
  '/admin',
  '/admin/users',
  '/admin/applications',
  '/admin/courses',
  '/admin/courses/moderation',
  '/admin/categories',
  '/admin/reviews',
  '/admin/certificates',
  '/admin/audit-log',
];
const STUDENT_SCREENS = ['/app', '/app/courses', '/app/certificates', '/app/notifications', '/app/profile', '/app/settings'];
const TEACH_SCREENS = ['/app/teach', '/app/teach/reviews'];

async function newContext(browser: Browser, locale: string): Promise<BrowserContext> {
  const context = await browser.newContext({ locale, viewport: { width: WIDTHS[0] ?? 360, height: HEIGHT } });
  await preferLanguage(context, locale);
  return context;
}

/** The href of the first link on `listUrl` that starts with `prefix`, so detail pages come from the seed. */
async function firstHref(page: Page, listUrl: string, prefix: string): Promise<string> {
  await page.goto(listUrl);
  const link = page.locator(`#main a[href^="${prefix}"]`).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  if (!href) throw new Error(`No ${prefix} link on ${listUrl}`);
  return href;
}

/** The elements that stick out past the right edge, for a readable failure. */
async function overflowAt(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const root = document.documentElement;
    if (root.scrollWidth <= root.clientWidth) return null;
    const offenders = [...document.body.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.getBoundingClientRect().right > root.clientWidth + 1)
      .filter((element) => !element.parentElement || element.parentElement.getBoundingClientRect().right <= root.clientWidth + 1)
      .slice(0, 3)
      .map((element) => element.outerHTML.slice(0, 120));
    return `scrollWidth ${root.scrollWidth} > ${root.clientWidth}: ${offenders.join(' | ')}`;
  });
}

/** Every page at every width in both themes; the viewport is resized in place, so media queries apply. */
async function horizontalScrollIn(context: BrowserContext, page: Page, urls: string[]): Promise<string[]> {
  const language = languageOf(test.info().project.use.locale ?? 'uk-UA');
  const found: string[] = [];
  for (const theme of THEMES) {
    await context.addCookies([{ name: 'theme', value: theme, url: BASE_URL }]);
    for (const url of urls) {
      await page.setViewportSize({ width: WIDTHS[0] ?? 360, height: HEIGHT });
      await page.goto(url);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const overflow = await overflowAt(page);
        if (overflow) found.push(`[${theme} ${width}px] ${url}: ${overflow}`);
      }
    }
  }
  return found;
}

test.describe.configure({ timeout: 300_000 });

test('server-rendered pages fit every width without horizontal scroll @both', async ({ browser }, testInfo) => {
  const { t } = translatorFor(testInfo);
  const context = await newContext(browser, testInfo.project.use.locale ?? 'uk-UA');
  const page = await context.newPage();

  const course = await firstHref(page, '/courses', '/courses/');
  const instructor = await firstHref(page, course, '/instructors/');
  await logIn(page, t, DEMO.admin);
  await preferLanguage(page.context(), testInfo.project.use.locale ?? 'uk-UA');
  const certificate = await firstHref(page, '/admin/certificates', '/certificates/');
  const user = await firstHref(page, '/admin/users', '/admin/users/');
  const application = await firstHref(page, '/admin/applications', '/admin/applications/');
  const adminCourse = await firstHref(page, '/admin/courses', '/admin/courses/');

  const found = await horizontalScrollIn(context, page, [
    ...PUBLIC_PAGES,
    course,
    instructor,
    certificate,
    ...ADMIN_PAGES,
    user,
    application,
    adminCourse,
  ]);
  expect(found).toEqual([]);
  await context.close();
});

test('SPA screens fit every width without horizontal scroll @both', async ({ browser }, testInfo) => {
  const { t } = translatorFor(testInfo);
  const locale = testInfo.project.use.locale ?? 'uk-UA';

  const student = await newContext(browser, locale);
  const studentPage = await student.newPage();
  await logIn(studentPage, t, STUDENT);
  await preferLanguage(studentPage.context(), locale);
  const lesson = await firstHref(studentPage, '/app/courses', '/app/learn/');
  const found = await horizontalScrollIn(student, studentPage, [...STUDENT_SCREENS, lesson]);
  await student.close();

  const instructor = await newContext(browser, locale);
  const instructorPage = await instructor.newPage();
  await logIn(instructorPage, t, DEMO.instructor);
  await preferLanguage(instructorPage.context(), locale);
  const editor = await firstHref(instructorPage, '/app/teach', '/app/teach/courses/');
  await instructorPage.goto(editor);
  await instructorPage.getByRole('tab', { name: t('app.teach.editor.curriculum') }).click();
  const lessonEditor = await instructorPage.locator('#main a[href^="/app/teach/lessons/"]').first().getAttribute('href');
  if (!lessonEditor) throw new Error('No lesson editor link in the curriculum');
  found.push(
    ...(await horizontalScrollIn(instructor, instructorPage, [
      ...TEACH_SCREENS,
      editor,
      `${editor}/students`,
      `${editor}/stats`,
      lessonEditor,
    ])),
  );
  await instructor.close();

  expect(found).toEqual([]);
});
