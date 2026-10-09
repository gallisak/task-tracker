import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './support/test-app.js';

const LIMIT = vi.hoisted(() => {
  const limit = 3;
  process.env.AUTH_THROTTLE_LIMIT = String(limit);
  return limit;
});

describe('Login rate limiting (e2e)', () => {
  let app: NestExpressApplication;

  const attemptLogin = () =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

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

  it('does not limit token refresh', async () => {
    for (let i = 0; i < LIMIT + 2; i++) {
      await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
    }
  });
});
