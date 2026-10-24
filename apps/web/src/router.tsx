import { createBrowserRouter } from 'react-router';
import { RequireAuth } from './features/auth/RequireAuth';
import { AppLayout } from './features/navigation/AppLayout';
import { NotFoundPage } from './features/navigation/NotFoundPage';
import { config } from './shared/config';

/** Routes of the dashboard; every story adds its lazily loaded screens here. */
export const router = createBrowserRouter(
  [
    {
      element: (
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      ),
      children: [
        {
          path: 'settings',
          lazy: async () => ({ Component: (await import('./features/settings/SettingsPage')).SettingsPage }),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: config.appBasePath },
);
