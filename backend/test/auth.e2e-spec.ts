import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

const validUser = {
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  password: 'correct-horse-battery',
};

function refreshCookieOf(response: request.Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[];
  const cookie = cookies.find((value) => value.startsWith('refresh_token='));
  if (!cookie) {
    throw new Error('Response did not set a refresh cookie');
  }
  return cookie;
}

function cookiePair(setCookie: string): string {
  return setCookie.split(';')[0];
}

function tokenIdOf(cookie: string): string {
  const [, payload] = cookie.slice('refresh_token='.length).split('.');
  const claims = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as { jti: string };
  return claims.jti;
}

describe('Auth (e2e)', () => {
  let app: NestExpressApplication;

  const register = (body: object = validUser) =>
    request(app.getHttpServer()).post('/api/auth/register').send(body);

  const login = (body: object) =>
    request(app.getHttpServer()).post('/api/auth/login').send(body);

  const refresh = (cookie?: string) => {
    const call = request(app.getHttpServer()).post('/api/auth/refresh');
    return cookie ? call.set('Cookie', cookie) : call;
  };

  const expireRotationGrace = () =>
    app.get(PrismaService).refreshToken.updateMany({
      where: { revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('creates a user and returns an access token with the public profile', async () => {
      const response = await register().expect(201);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: validUser.email,
          name: validUser.name,
          createdAt: expect.any(String),
        },
      });
    });

    it('sets the refresh token as an http-only cookie scoped to auth routes', async () => {
      const cookie = refreshCookieOf(await register().expect(201));

      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/auth');
    });

    it('stores a hash instead of the password', async () => {
      await register().expect(201);

      const stored = await app
        .get(PrismaService)
        .user.findUniqueOrThrow({ where: { email: validUser.email } });

      expect(stored.passwordHash).not.toContain(validUser.password);
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    });

    it('normalizes the email and trims the name', async () => {
      const response = await register({
        ...validUser,
        email: '  Ada@Example.COM ',
        name: '  Ada  ',
      }).expect(201);

      expect(response.body.user).toMatchObject({
        email: 'ada@example.com',
        name: 'Ada',
      });
    });

    it('rejects an email that is already registered, ignoring case', async () => {
      await register().expect(201);

      const response = await register({
        ...validUser,
        email: 'ADA@example.com',
      }).expect(409);

      expect(response.body.message).toBe('Email is already registered');
    });

    it('reports every invalid field', async () => {
      const response = await register({
        email: 'not-an-email',
        name: '   ',
        password: 'short',
      }).expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          'email must be an email',
          'name should not be empty',
          'password must be longer than or equal to 8 characters',
        ]),
      );
    });

    it('rejects fields that are not part of the contract', async () => {
      const response = await register({ ...validUser, role: 'OWNER' }).expect(
        400,
      );

      expect(response.body.details).toContain('property role should not exist');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await register().expect(201);
    });

    it('returns tokens for valid credentials, ignoring email case', async () => {
      const response = await login({
        email: 'ADA@example.com',
        password: validUser.password,
      }).expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user.email).toBe(validUser.email);
      expect(refreshCookieOf(response)).toContain('HttpOnly');
    });

    it('answers identically for a wrong password and an unknown email', async () => {
      const wrongPassword = await login({
        email: validUser.email,
        password: 'wrong-password',
      }).expect(401);
      const unknownEmail = await login({
        email: 'nobody@example.com',
        password: validUser.password,
      }).expect(401);

      expect(wrongPassword.body.message).toBe('Invalid email or password');
      expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues a new access token and rotates the refresh token', async () => {
      const original = refreshCookieOf(await register().expect(201));

      const response = await refresh(cookiePair(original)).expect(200);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user.email).toBe(validUser.email);
      expect(cookiePair(refreshCookieOf(response))).not.toBe(
        cookiePair(original),
      );
    });

    it('rejects a request without the cookie', async () => {
      await refresh().expect(401);
    });

    it('rejects a forged token', async () => {
      await refresh('refresh_token=not.a.jwt').expect(401);
    });

    it('hands a retry inside the grace period the token that was already issued', async () => {
      const first = cookiePair(refreshCookieOf(await register().expect(201)));
      const second = cookiePair(
        refreshCookieOf(await refresh(first).expect(200)),
      );

      const retried = cookiePair(
        refreshCookieOf(await refresh(first).expect(200)),
      );

      expect(tokenIdOf(retried)).toBe(tokenIdOf(second));
      const active = await app
        .get(PrismaService)
        .refreshToken.count({ where: { revokedAt: null } });
      expect(active).toBe(1);
      await refresh(retried).expect(200);
    });

    it('ends the session once two holders of a token replayed in the grace period both use it', async () => {
      const first = cookiePair(refreshCookieOf(await register().expect(201)));
      const owner = cookiePair(
        refreshCookieOf(await refresh(first).expect(200)),
      );
      const thief = cookiePair(
        refreshCookieOf(await refresh(first).expect(200)),
      );

      const thiefNext = cookiePair(
        refreshCookieOf(await refresh(thief).expect(200)),
      );
      await expireRotationGrace();

      await refresh(owner).expect(401);
      await refresh(thiefNext).expect(401);
    });

    it('revokes the whole session when a used token is replayed after the grace period', async () => {
      const first = cookiePair(refreshCookieOf(await register().expect(201)));
      const second = cookiePair(
        refreshCookieOf(await refresh(first).expect(200)),
      );
      await expireRotationGrace();

      await refresh(first).expect(401);
      await refresh(second).expect(401);
      await refresh(first).expect(401);
    });

    it('keeps other sessions of the same user alive after a replay', async () => {
      const first = cookiePair(refreshCookieOf(await register().expect(201)));
      const otherDevice = cookiePair(
        refreshCookieOf(
          await login({
            email: validUser.email,
            password: validUser.password,
          }).expect(200),
        ),
      );

      await refresh(first).expect(200);
      await expireRotationGrace();
      await refresh(first).expect(401);

      await refresh(otherDevice).expect(200);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes the session and clears the cookie', async () => {
      const cookie = cookiePair(refreshCookieOf(await register().expect(201)));

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .expect(204);

      expect(refreshCookieOf(response)).toContain('refresh_token=;');
      await refresh(cookie).expect(401);
    });

    it('succeeds even without a session', async () => {
      await request(app.getHttpServer()).post('/api/auth/logout').expect(204);
    });
  });
});
