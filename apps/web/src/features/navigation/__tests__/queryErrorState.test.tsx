import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fromHttpResponse, transportError } from '../../../shared/api/apiError';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { QueryErrorState } from '../QueryErrorState';

describe('QueryErrorState (FR-046)', () => {
  it('offers a retry for a transient failure', async () => {
    document.cookie = 'locale=uk; path=/';
    const onRetry = vi.fn();
    renderWithStore(<QueryErrorState error={transportError('NETWORK')} onRetry={onRetry} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Спробувати ще раз' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('leads to a safe place for a terminal failure: the dashboard or the given page', async () => {
    document.cookie = 'locale=uk; path=/';
    const notFound = fromHttpResponse(404, { error: { code: 'NOT_FOUND', message: 'Курс не знайдено.' } });
    const { unmount } = renderWithStore(<QueryErrorState error={notFound} onRetry={vi.fn()} />);

    expect(await screen.findByText('Курс не знайдено.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Спробувати ще раз' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Кабінет' })).toHaveAttribute('href', '/');
    unmount();

    renderWithStore(<QueryErrorState error={notFound} onRetry={vi.fn()} back={{ to: '/teach', label: 'До курсів' }} />);
    expect(await screen.findByRole('link', { name: 'До курсів' })).toHaveAttribute('href', '/teach');
  });
});
