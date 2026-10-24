import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['source'] },
  test: {
    include: ['tests/**/*.test.ts'],
    env: { NODE_ENV: 'test' },
    // Integration tests share one database, so files run one at a time.
    fileParallelism: false,
  },
});
