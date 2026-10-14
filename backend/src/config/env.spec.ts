import 'reflect-metadata';
import { validateEnv } from './env.js';

const ACCESS_SECRET = 'a'.repeat(48);
const REFRESH_SECRET = 'r'.repeat(48);
const DEFAULT_ACCESS_SECRET = 'change-me-access-secret-at-least-32-chars';
const DEFAULT_REFRESH_SECRET = 'change-me-refresh-secret-at-least-32-chars';

const env = (overrides: Record<string, unknown> = {}) => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/app',
  JWT_ACCESS_SECRET: ACCESS_SECRET,
  JWT_REFRESH_SECRET: REFRESH_SECRET,
  ...overrides,
});

describe('validateEnv', () => {
  it('accepts distinct custom secrets in production', () => {
    expect(validateEnv(env())).toMatchObject({
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: ACCESS_SECRET,
      JWT_REFRESH_SECRET: REFRESH_SECRET,
    });
  });

  it('refuses the default access secret in production', () => {
    expect(() =>
      validateEnv(env({ JWT_ACCESS_SECRET: DEFAULT_ACCESS_SECRET })),
    ).toThrow('JWT_ACCESS_SECRET must not keep its default value');
  });

  it('refuses the default refresh secret in production', () => {
    expect(() =>
      validateEnv(env({ JWT_REFRESH_SECRET: DEFAULT_REFRESH_SECRET })),
    ).toThrow('JWT_REFRESH_SECRET must not keep its default value');
  });

  it('allows the default secrets outside production', () => {
    for (const NODE_ENV of ['development', 'test']) {
      expect(() =>
        validateEnv(
          env({
            NODE_ENV,
            JWT_ACCESS_SECRET: DEFAULT_ACCESS_SECRET,
            JWT_REFRESH_SECRET: DEFAULT_REFRESH_SECRET,
          }),
        ),
      ).not.toThrow();
    }
  });

  it('refuses the same secret for access and refresh tokens in any environment', () => {
    for (const NODE_ENV of ['development', 'test', 'production']) {
      expect(() =>
        validateEnv(env({ NODE_ENV, JWT_REFRESH_SECRET: ACCESS_SECRET })),
      ).toThrow('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
    }
  });

  it('still reports ordinary validation errors', () => {
    expect(() => validateEnv(env({ JWT_ACCESS_SECRET: 'short' }))).toThrow(
      'Invalid environment configuration',
    );
  });
});
