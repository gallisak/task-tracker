import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp, resetDatabase } from './support/test-app.js';

const credentials = {
  email: 'grace@example.com',
  name: 'Grace Hopper',
  password: 'correct-horse-battery',
};

describe('Protected routes (e2e)', () => {
  let app: NestExpressApplication;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  const me = (token?: string) => {
    const call = request(app.getHttpServer()).get('/api/users/me');
    return token ? call.set('Authorization', `Bearer ${token}`) : call;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);

    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);

    accessToken = response.body.accessToken;
    userId = response.body.user.id;
    const cookies = response.headers['set-cookie'] as unknown as string[];
    refreshToken = cookies[0].split(';')[0].split('=')[1];
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the profile of the token owner', async () => {
    const response = await me(accessToken).expect(200);

    expect(response.body).toEqual({
      id: userId,
      email: credentials.email,
      name: credentials.name,
      createdAt: expect.any(String),
    });
  });

  it('rejects a request without a token', async () => {
    const response = await me().expect(401);

    expect(response.body.message).toBe('Access token is missing');
  });

  it('rejects a malformed token', async () => {
    await me('not.a.jwt').expect(401);
  });

  it('rejects a refresh token used as an access token', async () => {
    await me(refreshToken).expect(401);
  });

  it('rejects an expired token', async () => {
    const expired = await app.get(JwtService).signAsync(
      { sub: userId, email: credentials.email },
      {
        secret: app.get(ConfigService).getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: -10,
      },
    );

    await me(expired).expect(401);
  });

  it('rejects a token signed with another secret', async () => {
    const forged = await app
      .get(JwtService)
      .signAsync(
        { sub: userId, email: credentials.email },
        { secret: 'x'.repeat(40), expiresIn: 60 },
      );

    await me(forged).expect(401);
  });
});
