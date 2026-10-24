import { useCallback, useSyncExternalStore } from 'react';

const TICK_MS = 1000;

function subscribeToTicks(onTick: () => void): () => void {
  const timer = window.setInterval(onTick, TICK_MS);
  return () => window.clearInterval(timer);
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

/** Seconds left until `timestamp` (epoch ms), re-rendering every second while it counts down. */
export function useSecondsUntil(timestamp: number | null): number {
  // Whole seconds stay the same between ticks, so the snapshot is stable as React requires.
  const secondsLeft = useCallback(
    () => (timestamp ? Math.max(0, Math.ceil((timestamp - Date.now()) / TICK_MS)) : 0),
    [timestamp],
  );
  return useSyncExternalStore(timestamp ? subscribeToTicks : subscribeToNothing, secondsLeft);
}
