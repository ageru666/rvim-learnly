/** The SPA's only console access, so failures are logged in one consistent shape (guideline §3.5). */
export function logFailure(operation: string, details: Record<string, unknown>): void {
  // eslint-disable-next-line no-console -- intentional: the browser console is the client log sink
  console.warn(`[learnly] ${operation} failed`, { ...details, at: new Date().toISOString() });
}
