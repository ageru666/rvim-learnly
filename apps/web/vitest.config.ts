import react from '@vitejs/plugin-react';
import { defaultClientConditions } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['source', ...defaultClientConditions],
  },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:5173/app/' } },
    setupFiles: ['src/shared/test/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/shared/test/**'],
      thresholds: {
        'src/**/utils.ts': { lines: 100, branches: 100, functions: 100, statements: 100 },
        'src/shared/utils/**': { lines: 100, branches: 100, functions: 100, statements: 100 },
      },
    },
  },
});
