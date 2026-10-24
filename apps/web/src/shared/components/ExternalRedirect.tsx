import { useEffect } from 'react';
import { PageLoader } from './PageLoader';

/** Full page navigation to a server-rendered route (login, catalog), which React Router cannot do. */
export function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return <PageLoader />;
}
