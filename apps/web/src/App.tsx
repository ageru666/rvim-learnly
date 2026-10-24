import { RefreshCw } from 'lucide-react';
import { RouterProvider } from 'react-router';
import { Button } from './shared/components/Button';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { ToastProvider } from './shared/components/ToastProvider';
import { useT } from './features/locale/useT';
import { router } from './router';

/** Static fallback: no data fetching, one recovery action (guideline §3.6). */
function CrashFallback() {
  const { t } = useT();
  return (
    <section className="page-container flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="heading-xl">{t('app.layout.crashTitle')}</h1>
      <p className="text-lead">{t('app.layout.crashText')}</p>
      <Button onClick={() => window.location.reload()}>
        <RefreshCw aria-hidden size={16} />
        {t('app.layout.reload')}
      </Button>
    </section>
  );
}

export function App() {
  return (
    <ErrorBoundary fallback={<CrashFallback />}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  );
}
