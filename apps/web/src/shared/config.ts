/** Public, non-secret client configuration. The API lives on the same origin as the SPA. */
export const config = {
  apiBaseUrl: '/api/v1',
  /** Server-rendered site (catalog, course pages, login) shares the origin. */
  siteUrl: '/',
  appBasePath: '/app',
} as const;
