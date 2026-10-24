import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

const SERVER_URL = 'http://localhost:3000';

export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwindcss()],
  resolve: {
    conditions: ['source', ...defaultClientConditions],
  },
  server: {
    port: 5173,
    strictPort: true,
    // Single entry point in development: everything except the SPA under /app is served by the
    // Express server, so the site, admin panel, API and SPA share one origin and one set of cookies.
    proxy: {
      '^/(?!app(/|$)).*': { target: SERVER_URL, changeOrigin: false },
    },
  },
});
