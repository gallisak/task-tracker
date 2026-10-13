import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './support/test-app.js';

const { LIMIT, REFRESH_LIMIT } = vi.hoisted(() => {
  const limits = { LIMIT: 3, REFRESH_LIMIT: 5 };
  process.env.AUTH_THROTTLE_LIMIT = String(limits.LIMIT);
  process.env.REFRESH_THROTTLE_LIMIT = String(limits.REFRESH_LIMIT);
  return limits;
});

describe('Auth rate limiting (e2e)', () => {
  let app: NestExpressApplication;

  const attemptLogin = () =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

  const attemptRefresh = () =>
    request(app.getHttpServer()).post('/api/auth/refresh');

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks further attempts once the limit is reached', async () => {
    for (let i = 0; i < LIMIT; i++) {
      await attemptLogin().expect(401);
    }

    const response = await attemptLogin().expect(429);

    expect(response.body).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
      path: '/api/auth/login',
    });
  });

  it('blocks token refresh once its own limit is reached', async () => {
    await attemptLogin().expect(429);

    for (let i = 0; i < REFRESH_LIMIT; i++) {
      await attemptRefresh().expect(401);
    }

    const response = await attemptRefresh().expect(429);

    expect(response.body).toMatchObject({
      statusCode: 429,
      error: 'Too Many Requests',
      path: '/api/auth/refresh',
    });
  });
});
