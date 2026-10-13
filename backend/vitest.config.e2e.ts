import { defineConfig } from 'vitest/config';
import { resolveTestDatabaseUrl } from './test/support/test-database.js';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: './test/global-setup.ts',
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: resolveTestDatabaseUrl(),
      AUTH_THROTTLE_LIMIT: '1000',
    },
  },
});
