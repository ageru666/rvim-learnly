import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
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
