import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { ProfilePage } from '../ProfilePage';
import { avatarFileProblem, linkDefaults, profileFormSchema, toProfileValues } from '../utils';

const ME = {
  id: '01970000-0000-7000-8000-000000000001',
  name: 'Олена',
  avatarUrl: null,
  email: 'olena@learnly.local',
  emailVerified: true,
  role: 'student',
  locale: 'uk',
  bio: null,
  links: { github: 'https://github.com/olena' },
};

function renderProfile(me: object = ME) {
  document.cookie = 'locale=uk; path=/';
  server.use(http.get(`${config.apiBaseUrl}/me`, () => HttpResponse.json(me)));
  return renderWithStore(<ProfilePage />);
}

describe('profile utils', () => {
  it('nests the flat link fields and fills empty defaults', () => {
    const values = toProfileValues([
      ['name', 'Олена'],
      ['bio', ''],
      ['links.website', ''],
      ['links.github', 'https://github.com/olena'],
    ]);
    expect(values).toEqual({ name: 'Олена', bio: '', links: { website: '', github: 'https://github.com/olena' } });
    expect(profileFormSchema.parse(values)).toEqual({ name: 'Олена', bio: null, links: { github: 'https://github.com/olena' } });
    expect(linkDefaults({ github: 'https://github.com/olena' })).toEqual({ website: '', github: 'https://github.com/olena', linkedin: '' });
    const all = { website: 'https://a.dev', github: 'https://github.com/a', linkedin: 'https://linkedin.com/in/a' };
    expect(linkDefaults(all)).toEqual(all);
    expect(linkDefaults({})).toEqual({ website: '', github: '', linkedin: '' });
  });

  it('checks the avatar type before the size', () => {
    expect(avatarFileProblem({ type: 'text/plain', size: 10 })).toBe('errors.upload.invalidType');
    expect(avatarFileProblem({ type: 'image/png', size: 1024 * 1024 + 1 })).toBe('errors.upload.tooLarge');
    expect(avatarFileProblem({ type: 'image/webp', size: 1024 })).toBeNull();
  });
});

describe('ProfilePage', () => {
  it('validates with the shared contract before sending', async () => {
    let called = false;
    server.use(
      http.patch(`${config.apiBaseUrl}/me`, () => {
        called = true;
        return HttpResponse.json(ME);
      }),
    );
    renderProfile();
    const name = await screen.findByLabelText('Імʼя');
    await userEvent.clear(name);
    await userEvent.type(name, 'О');
    await userEvent.type(screen.getByLabelText('Вебсайт'), 'not a link');
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти профіль' }));

    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByLabelText('Вебсайт')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('GitHub')).not.toHaveAttribute('aria-invalid');
    expect(called).toBe(false);
  });

  it('saves the profile and shows server field errors next to the field', async () => {
    let body: unknown;
    server.use(
      http.patch(`${config.apiBaseUrl}/me`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...ME, bio: 'Викладаю JS.' });
      }),
    );
    renderProfile();
    await userEvent.type(await screen.findByLabelText('Про мене'), 'Викладаю JS.');
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти профіль' }));
    expect(await screen.findByText('Профіль збережено.')).toBeInTheDocument();
    expect(body).toEqual({ name: 'Олена', bio: 'Викладаю JS.', links: { github: 'https://github.com/olena' } });

    server.use(
      http.patch(`${config.apiBaseUrl}/me`, () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Перевірте введені дані.', details: [{ path: 'links.linkedin', message: 'Недійсне посилання.' }] } },
          { status: 400 },
        ),
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Зберегти профіль' }));
    expect(await screen.findByText('Недійсне посилання.')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn')).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a wrong avatar file at once and shows a server rejection', async () => {
    let uploads = 0;
    server.use(
      http.post(`${config.apiBaseUrl}/me/avatar`, () => {
        uploads += 1;
        return HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Підтримуються лише зображення JPG, PNG або WebP.' } }, { status: 400 });
      }),
    );
    renderProfile();
    const input = await screen.findByLabelText('Завантажити аватар');
    await userEvent.upload(input, new File(['x'.repeat(1024 * 1024 + 1)], 'big.png', { type: 'image/png' }));
    expect(await screen.findByText('Файл завеликий.')).toBeInTheDocument();
    expect(uploads).toBe(0);

    await userEvent.upload(input, new File(['text'], 'fake.png', { type: 'image/png' }));
    expect(await screen.findByText('Підтримуються лише зображення JPG, PNG або WebP.')).toBeInTheDocument();
    expect(uploads).toBe(1);
  });

  it('uploads and removes the avatar', async () => {
    let me: object = ME;
    server.use(
      http.get(`${config.apiBaseUrl}/me`, () => HttpResponse.json(me)),
      http.post(`${config.apiBaseUrl}/me/avatar`, () => {
        me = { ...ME, avatarUrl: '/uploads/avatars/a.webp' };
        return HttpResponse.json(me);
      }),
      http.delete(`${config.apiBaseUrl}/me/avatar`, () => {
        me = ME;
        return HttpResponse.json(me);
      }),
    );
    renderWithStore(<ProfilePage />);
    await userEvent.upload(await screen.findByLabelText('Завантажити аватар'), new File(['img'], 'me.webp', { type: 'image/webp' }));
    expect(await screen.findByText('Аватар оновлено.')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Видалити' }));
    expect(await screen.findByText(/Аватар видалено/)).toBeInTheDocument();
  });
});
