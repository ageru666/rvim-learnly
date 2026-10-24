import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './App';
import { createStore } from './store';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root is missing in index.html');

createRoot(container).render(
  <StrictMode>
    <Provider store={createStore()}>
      <App />
    </Provider>
  </StrictMode>,
);
