import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './App';
import { localeApi } from './features/locale/localeApi';
import { selectLocale } from './features/locale/localeSlice';
import { createStore } from './store';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root container #root is missing in index.html');
const container = root;

const store = createStore();

function render(): void {
  createRoot(container).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>,
  );
}

// An English-speaking visitor's first render is already in English: its dictionary chunk is loaded first.
// (A promise rather than a top-level await, which would make the bundler split the entry into many chunks.)
if (selectLocale(store.getState()) === 'en') void store.dispatch(localeApi.endpoints.getEnglishDictionary.initiate()).then(render);
else render();
