import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { createMemoryRouter, MemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { createStore, type AppStore } from '../../store';

interface RenderOptions {
  route?: string;
  store?: AppStore;
}

/** Renders with the real store (real reducers, real RTK Query, MSW at the transport boundary). */
export function renderWithStore(ui: ReactElement, { route = '/', store = createStore() }: RenderOptions = {}) {
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>,
  );
  return { ...result, store };
}

/** For screens that need a data router (e.g. `useBlocker`): routes plus the starting URL. */
export function renderWithDataRouter(routes: RouteObject[], initialEntry: string, store: AppStore = createStore()) {
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  const result = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return { ...result, store, router };
}
