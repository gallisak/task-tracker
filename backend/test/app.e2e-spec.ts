import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp } from './support/test-app.js';

describe('App (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports its health without authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      uptimeSeconds: expect.any(Number),
      databaseLatencyMs: expect.any(Number),
      timestamp: expect.any(String),
    });
  });

  it('sends security headers and hides the framework', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'self'",
    );
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('returns errors in the unified format', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/does-not-exist')
      .expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: 'Cannot GET /api/does-not-exist',
      path: '/api/does-not-exist',
      timestamp: expect.any(String),
    });
  });

  it('rejects an oversized body with 413', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'a'.repeat(200_000) })
      .expect(413);

    expect(response.body).toMatchObject({
      statusCode: 413,
      error: 'Payload Too Large',
      message: 'Payload Too Large',
      path: '/api/auth/login',
    });
  });
});
