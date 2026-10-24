import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { readCookie } from '../../../shared/api/browserStorage';
import { renderWithStore } from '../../../shared/test/renderWithStore';
import { ThemeToggle } from '../ThemeToggle';
import { selectTheme } from '../themeSlice';

describe('ThemeToggle', () => {
  it('applies and remembers the chosen theme', async () => {
    document.cookie = 'locale=en; path=/';
    document.documentElement.dataset.theme = 'system';
    const { store } = renderWithStore(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Dark' }));

    expect(selectTheme(store.getState())).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(readCookie('theme')).toBe('dark');
  });
});
