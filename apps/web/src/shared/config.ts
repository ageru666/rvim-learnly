/** Public, non-secret client configuration. The API lives on the same origin as the SPA. */
export const config = {
  /** Absolute on the current origin (works the same in the browser and in tests). */
  apiBaseUrl: `${window.location.origin}/api/v1`,
  /** Server-rendered site (catalog, course pages, login) shares the origin. */
  siteUrl: '/',
  appBasePath: '/app',
} as const;
