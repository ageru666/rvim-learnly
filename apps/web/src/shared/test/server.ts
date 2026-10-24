import { setupServer } from 'msw/node';

/** MSW server for SPA tests; each test registers its handlers with `server.use(...)`. */
export const server = setupServer();
