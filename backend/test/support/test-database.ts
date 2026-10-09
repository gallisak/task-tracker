import { config } from 'dotenv';

const TEST_SUFFIX = '_test';

export function resolveTestDatabaseUrl(): string {
  config({ path: ['.env', '../.env'], quiet: true });

  const source = process.env.DATABASE_URL;
  if (!source) {
    throw new Error('DATABASE_URL must be set to run e2e tests');
  }

  const url = new URL(source);
  if (!url.pathname.endsWith(TEST_SUFFIX)) {
    url.pathname = `${url.pathname}${TEST_SUFFIX}`;
  }
  return url.toString();
}
