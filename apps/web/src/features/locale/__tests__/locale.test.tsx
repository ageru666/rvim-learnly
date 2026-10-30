import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { readCookie } from '../../../shared/api/browserStorage';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { LocaleSwitcher } from '../LocaleSwitcher';
import { selectLocale } from '../localeSlice';
import { useFormat } from '../useFormat';
import { useT } from '../useT';

function Greeting() {
  const { t } = useT();
  const format = useFormat();
  return (
    <p>
      {t('common.counts.lessons', { count: 5 })} {format.number(1234.5)}
    </p>
  );
}

describe('language switching', () => {
  it('starts from the cookie set by the server; the English dictionary arrives as its own chunk', async () => {
    document.cookie = 'locale=en; path=/';
    const { store } = renderWithStore(<Greeting />);
    expect(selectLocale(store.getState())).toBe('en');
    expect(await screen.findByText(/5 lessons/)).toBeInTheDocument();
  });

  it('re-renders texts and formats without a reload and remembers the choice', async () => {
    document.cookie = 'locale=uk; path=/';
    renderWithStore(
      <>
        <LocaleSwitcher />
        <Greeting />
      </>,
    );
    expect(screen.getByText(/5 уроків/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(await screen.findByText(/5 lessons 1,234.5/)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(readCookie('locale')).toBe('en');
    expect(window.localStorage.getItem('learnly:v1:locale')).toBe('"en"');
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
  });
});
