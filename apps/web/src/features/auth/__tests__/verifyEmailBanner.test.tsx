import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { VerifyEmailBanner } from '../VerifyEmailBanner';

function me(emailVerified: boolean) {
  return {
    id: '01970000-0000-7000-8000-000000000002',
    name: 'Taras',
    avatarUrl: null,
    email: 'taras@learnly.local',
    emailVerified,
    role: 'student',
    locale: 'en',
    bio: null,
    links: {},
  };
}

function renderBanner(emailVerified: boolean) {
  document.cookie = 'locale=en; path=/';
  server.use(http.get(`${config.apiBaseUrl}/me`, () => HttpResponse.json(me(emailVerified))));
  return renderWithStore(<VerifyEmailBanner />);
}

describe('VerifyEmailBanner', () => {
  it('is hidden for a verified email', async () => {
    const { store } = renderBanner(true);
    await waitFor(() => expect(store.getState().api.queries['getMe(undefined)']?.status).toBe('fulfilled'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('resends the email and shows the cooldown', async () => {
    server.use(http.post(`${config.apiBaseUrl}/auth/email/resend`, () => new HttpResponse(null, { status: 204 })));
    renderBanner(false);

    await userEvent.click(await screen.findByRole('button', { name: 'Send the email again' }));

    expect(await screen.findByText('A verification email was sent to taras@learnly.local.')).toBeInTheDocument();
    expect(screen.getByText(/You can resend in (60|59) s/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send the email again' })).not.toBeInTheDocument();
  });

  it('uses the wait time from a rate-limit answer', async () => {
    server.use(
      http.post(`${config.apiBaseUrl}/auth/email/resend`, () =>
        HttpResponse.json(
          { error: { code: 'RATE_LIMITED', message: 'The email was just sent.', retryAfterSec: 42 } },
          { status: 429 },
        ),
      ),
    );
    renderBanner(false);

    await userEvent.click(await screen.findByRole('button', { name: 'Send the email again' }));

    expect(await screen.findByText(/You can resend in (42|41) s/)).toBeInTheDocument();
    expect(screen.queryByText('The email was just sent.')).not.toBeInTheDocument();
  });
});
