import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { SettingsPage } from '../SettingsPage';

const ME = {
  id: '01970000-0000-7000-8000-000000000001',
  name: 'Олена',
  avatarUrl: null,
  email: 'olena@learnly.local',
  emailVerified: true,
  role: 'student',
  locale: 'uk',
  bio: null,
  links: {},
};

function renderSettings() {
  document.cookie = 'locale=uk; path=/';
  server.use(http.get(`${config.apiBaseUrl}/me`, () => HttpResponse.json(ME)));
  return renderWithStore(<SettingsPage />);
}

describe('change password', () => {
  it('reports a mismatched confirmation without calling the server', async () => {
    let called = false;
    server.use(
      http.put(`${config.apiBaseUrl}/me/password`, () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSettings();

    await userEvent.type(await screen.findByLabelText('Поточний пароль'), 'Learnly2026!');
    await userEvent.type(screen.getByLabelText('Новий пароль'), 'newpass123');
    await userEvent.type(screen.getByLabelText('Повторіть новий пароль'), 'other1234');
    await userEvent.click(screen.getByRole('button', { name: 'Змінити пароль' }));

    expect(await screen.findByText('Паролі не збігаються.')).toBeInTheDocument();
    expect(screen.getByLabelText('Повторіть новий пароль')).toHaveAttribute('aria-invalid', 'true');
    expect(called).toBe(false);
  });

  it('sends the change and confirms it', async () => {
    let body: unknown;
    server.use(
      http.put(`${config.apiBaseUrl}/me/password`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSettings();

    await userEvent.type(await screen.findByLabelText('Поточний пароль'), 'Learnly2026!');
    await userEvent.type(screen.getByLabelText('Новий пароль'), 'newpass123');
    await userEvent.type(screen.getByLabelText('Повторіть новий пароль'), 'newpass123');
    await userEvent.click(screen.getByRole('button', { name: 'Змінити пароль' }));

    expect(await screen.findByText('Пароль змінено. Сесії на інших пристроях завершено.')).toBeInTheDocument();
    expect(body).toEqual({ currentPassword: 'Learnly2026!', newPassword: 'newpass123' });
    expect(screen.getByLabelText('Поточний пароль')).toHaveValue('');
  });

  it('shows the server message for a wrong current password', async () => {
    server.use(
      http.put(`${config.apiBaseUrl}/me/password`, () =>
        HttpResponse.json(
          { error: { code: 'BUSINESS_RULE_VIOLATION', message: 'Невірний поточний пароль.', rule: 'CURRENT_PASSWORD' } },
          { status: 422 },
        ),
      ),
    );
    renderSettings();

    await userEvent.type(await screen.findByLabelText('Поточний пароль'), 'wrong');
    await userEvent.type(screen.getByLabelText('Новий пароль'), 'newpass123');
    await userEvent.type(screen.getByLabelText('Повторіть новий пароль'), 'newpass123');
    await userEvent.click(screen.getByRole('button', { name: 'Змінити пароль' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Невірний поточний пароль.');
  });
});

describe('change email', () => {
  it('asks to confirm the new address', async () => {
    server.use(http.post(`${config.apiBaseUrl}/me/email`, () => new HttpResponse(null, { status: 204 })));
    renderSettings();

    expect(await screen.findByText('Поточний email: olena@learnly.local')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Новий email'), 'olena.new@learnly.local');
    await userEvent.type(screen.getByLabelText('Пароль'), 'Learnly2026!');
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати підтвердження' }));

    expect(
      await screen.findByText('Ми надіслали лист на olena.new@learnly.local. Адреса зміниться після підтвердження.'),
    ).toBeInTheDocument();
  });

  it('shows field errors from the server next to the field', async () => {
    server.use(
      http.post(`${config.apiBaseUrl}/me/email`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Перевірте введені дані.',
              details: [{ path: 'newEmail', message: 'Некоректна адреса.' }],
            },
          },
          { status: 400 },
        ),
      ),
    );
    renderSettings();

    await userEvent.type(await screen.findByLabelText('Новий email'), 'olena@learnly.local');
    await userEvent.type(screen.getByLabelText('Пароль'), 'Learnly2026!');
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати підтвердження' }));

    expect(await screen.findByText('Некоректна адреса.')).toBeInTheDocument();
    expect(screen.getByLabelText('Новий email')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('log out everywhere', () => {
  it('asks for confirmation before ending every session', async () => {
    let calls = 0;
    server.use(
      http.post(`${config.apiBaseUrl}/auth/logout-all`, () => {
        calls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSettings();

    await userEvent.click(await screen.findByRole('button', { name: 'Вийти на всіх пристроях' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Доведеться знову увійти на кожному пристрої.');
    await userEvent.click(screen.getByRole('button', { name: 'Скасувати' }));
    expect(calls).toBe(0);
  });
});

describe('interface language', () => {
  it('switches the whole page and saves the account language', async () => {
    let saved: unknown = null;
    server.use(
      http.patch(`${config.apiBaseUrl}/me`, async ({ request }) => {
        saved = await request.json();
        return HttpResponse.json({ ...ME, locale: 'en' });
      }),
    );
    renderSettings();

    await userEvent.click(await screen.findByRole('radio', { name: 'English' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    await waitFor(() => expect(saved).toEqual({ locale: 'en' }));
  });
});

describe('appearance', () => {
  it('applies the chosen theme and remembers it in the cookie the server renders with', async () => {
    renderSettings();
    await userEvent.click(await screen.findByRole('radio', { name: 'Темна' }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(document.cookie).toContain('theme=dark');
  });
});
