import { useEffect } from 'react';
import { useBlocker, type Blocker } from 'react-router';

/**
 * FR-TEACH-4: warns before leaving with unsaved changes, both for in-app navigation (the returned
 * blocker drives a confirmation dialog) and for closing or reloading the tab.
 */
export function useUnsavedChangesBlocker(hasChanges: boolean): Blocker {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => hasChanges && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!hasChanges) return undefined;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges]);

  return blocker;
}
