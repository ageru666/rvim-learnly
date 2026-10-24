import { Spinner } from './Spinner';

/** Full-area loader for route-level loading. */
export function PageLoader() {
  return (
    <div className="flex min-h-64 items-center justify-center" aria-busy="true">
      <Spinner size={32} className="text-text-muted" />
    </div>
  );
}
