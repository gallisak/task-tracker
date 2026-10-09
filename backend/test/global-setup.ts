import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { resolveTestDatabaseUrl } from './support/test-database.js';

async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const target = new URL(databaseUrl);
  const name = target.pathname.slice(1);
  if (!/^\w+$/.test(name)) {
    throw new Error(`Unsafe test database name: ${name}`);
  }

  const admin = new URL(databaseUrl);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });

  await client.connect();
  try {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await client.end();
  }
}

export default async function setup(): Promise<void> {
  const databaseUrl = resolveTestDatabaseUrl();

  await ensureDatabaseExists(databaseUrl);
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
