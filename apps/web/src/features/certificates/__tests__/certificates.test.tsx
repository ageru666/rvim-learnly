import type { CertificateDto } from '@learnly/contracts/certificates';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { config } from '../../../shared/config';
import { server } from '../../../shared/test/server';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { CertificatesPage } from '../CertificatesPage';

const CERTIFICATE: CertificateDto = {
  code: 'K7QW2M9XTR',
  courseTitle: 'Основи JavaScript',
  studentName: 'Олена',
  authorName: 'Тарас',
  issuedAt: '2026-10-20T10:00:00.000Z',
  revoked: false,
  url: 'http://localhost:3000/certificates/K7QW2M9XTR',
  courseId: '01970000-0000-7000-8000-00000000c001',
  courseSlug: 'js-basics',
};

function renderPage(certificates: CertificateDto[]) {
  document.cookie = 'locale=uk; path=/';
  server.use(http.get(`${config.apiBaseUrl}/me/certificates`, () => HttpResponse.json(certificates)));
  return renderWithStore(<CertificatesPage />);
}

describe('CertificatesPage', () => {
  it('lists certificates with view, copy and print actions', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderPage([CERTIFICATE]);

    expect(await screen.findByText('Основи JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Видано 20 жовтня 2026 р.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Переглянути' })).toHaveAttribute('href', CERTIFICATE.url);
    expect(screen.getByRole('link', { name: 'Друкувати або зберегти PDF' })).toHaveAttribute('href', `${CERTIFICATE.url}?print=1`);

    await userEvent.click(screen.getByRole('button', { name: 'Копіювати посилання' }));
    expect(writeText).toHaveBeenCalledWith(CERTIFICATE.url);
    expect(await screen.findByRole('button', { name: 'Посилання скопійовано' })).toBeInTheDocument();
  });

  it('explains a failed copy', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    renderPage([CERTIFICATE]);
    await userEvent.click(await screen.findByRole('button', { name: 'Копіювати посилання' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не вдалося скопіювати.');
  });

  it('marks revoked certificates and shows an empty state', async () => {
    const { unmount } = renderPage([{ ...CERTIFICATE, revoked: true }]);
    expect(await screen.findByText('Анульовано')).toBeInTheDocument();
    unmount();
    renderPage([]);
    expect(await screen.findByText('Сертифікат зʼявиться тут, коли ви завершите курс.')).toBeInTheDocument();
  });
});
