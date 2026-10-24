import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { useGetMeQuery } from '../../auth/authApi';
import { useGetDashboardQuery } from '../../enrollments/enrollmentsApi';
import { LocaleSwitcher } from '../LocaleSwitcher';
import { selectLocale } from '../localeSlice';
import { useFormat } from '../useFormat';
import { useT } from '../useT';

function me(locale: 'uk' | 'en') {
  return {
    id: '01970000-0000-7000-8000-000000000001',
    name: 'Олена',
    avatarUrl: null,
    email: 'olena@learnly.local',
    emailVerified: true,
    role: 'student',
    locale,
    bio: null,
    links: {},
  };
}

function Screen() {
  const { t } = useT();
  const format = useFormat();
  useGetMeQuery();
  useGetDashboardQuery();
  return (
    <>
      <LocaleSwitcher />
      <p>{t('common.counts.students', { count: 3 })}</p>
      <p>{format.date('2026-10-25T12:00:00Z', 'long')}</p>
      <label>
        {t('app.myCourses.search')}
        <input />
      </label>
    </>
  );
}

/** Loads `Me` the way the dashboard layout does. */
function SignedInSwitcher() {
  useGetMeQuery();
  return <LocaleSwitcher />;
}

const EMPTY_DASHBOARD = { continue: null, active: [], recommendations: [] };

describe('switching the language while signed in', () => {
  it('re-renders in place, keeps typed input, saves the account locale and refetches localized data', async () => {
    document.cookie = 'locale=uk; path=/';
    let patched: unknown = null;
    let dashboardCalls = 0;
    server.use(
      http.get(`${config.apiBaseUrl}/me`, () => HttpResponse.json(me(patched ? 'en' : 'uk'))),
      http.patch(`${config.apiBaseUrl}/me`, async ({ request }) => {
        patched = await request.json();
        return HttpResponse.json(me('en'));
      }),
      http.get(`${config.apiBaseUrl}/me/dashboard`, () => {
        dashboardCalls += 1;
        return HttpResponse.json(EMPTY_DASHBOARD);
      }),
    );
    renderWithStore(<Screen />);
    await waitFor(() => expect(dashboardCalls).toBe(1));
    expect(screen.getByText('3 студенти')).toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Пошук за назвою' });
    await userEvent.type(input, 'draft text');
    await userEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByText('3 students')).toBeInTheDocument();
    expect(screen.getByText('October 25, 2026')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search by title' })).toBe(input);
    expect(input).toHaveValue('draft text');
    await waitFor(() => expect(patched).toEqual({ locale: 'en' }));
    await waitFor(() => expect(dashboardCalls).toBe(2));
  });
});

describe('the account language', () => {
  it('applies on a device without a choice and is not remembered as one', async () => {
    server.use(http.get(`${config.apiBaseUrl}/me`, () => HttpResponse.json(me('en'))));
    const { store } = renderWithStore(<SignedInSwitcher />);
    await waitFor(() => expect(selectLocale(store.getState())).toBe('en'));
    expect(document.documentElement.lang).toBe('en');
    expect(document.cookie).not.toContain('locale=');
  });

  it('does not override a choice made on this device', async () => {
    document.cookie = 'locale=uk; path=/';
    let meLoaded = false;
    server.use(
      http.get(`${config.apiBaseUrl}/me`, () => {
        meLoaded = true;
        return HttpResponse.json(me('en'));
      }),
    );
    const { store } = renderWithStore(<SignedInSwitcher />);
    await waitFor(() => expect(meLoaded).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(selectLocale(store.getState())).toBe('uk');
  });
});
