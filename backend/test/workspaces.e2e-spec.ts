import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { bearer, registerUser, type TestUser } from './support/auth.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

describe('Workspaces (e2e)', () => {
  let app: NestExpressApplication;
  let alice: TestUser;
  let bob: TestUser;

  const createWorkspace = (user: TestUser, body: object) =>
    request(app.getHttpServer())
      .post('/api/workspaces')
      .set(...bearer(user))
      .send(body);

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    alice = await registerUser(app, 'Alice');
    bob = await registerUser(app, 'Bob');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/workspaces', () => {
    it('creates a workspace and makes the creator its owner', async () => {
      const response = await createWorkspace(alice, {
        name: '  Product team  ',
      }).expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        name: 'Product team',
        role: 'OWNER',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('rejects an empty name', async () => {
      const response = await createWorkspace(alice, { name: '   ' }).expect(
        400,
      );

      expect(response.body.details).toContain('name should not be empty');
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/workspaces')
        .send({ name: 'Product team' })
        .expect(401);
    });
  });

  describe('GET /api/workspaces', () => {
    it('lists only the workspaces the user belongs to', async () => {
      await createWorkspace(alice, { name: 'Alice one' }).expect(201);
      await createWorkspace(alice, { name: 'Alice two' }).expect(201);
      await createWorkspace(bob, { name: 'Bob only' }).expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set(...bearer(alice))
        .expect(200);

      expect(response.body.map((item: { name: string }) => item.name)).toEqual([
        'Alice two',
        'Alice one',
      ]);
    });

    it('returns an empty list for a user without workspaces', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/workspaces')
        .set(...bearer(bob))
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/workspaces/:workspaceId', () => {
    const getWorkspace = (user: TestUser, id: string) =>
      request(app.getHttpServer())
        .get(`/api/workspaces/${id}`)
        .set(...bearer(user));

    it('returns a workspace to its member', async () => {
      const created = await createWorkspace(alice, { name: 'Product team' });

      const response = await getWorkspace(alice, created.body.id).expect(200);

      expect(response.body).toMatchObject({
        id: created.body.id,
        name: 'Product team',
        role: 'OWNER',
      });
    });

    it('hides a workspace from users who are not members', async () => {
      const created = await createWorkspace(alice, { name: 'Product team' });

      const response = await getWorkspace(bob, created.body.id).expect(404);

      expect(response.body.message).toBe('Workspace not found');
    });

    it('returns 404 for a workspace that does not exist', async () => {
      await getWorkspace(alice, randomUUID()).expect(404);
    });

    it('rejects a malformed id', async () => {
      await getWorkspace(alice, 'not-a-uuid').expect(400);
    });
  });
});
