import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { bearer, registerUser, type TestUser } from './support/auth.js';
import { addMember } from './support/members.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

describe('Projects (e2e)', () => {
  let app: NestExpressApplication;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let workspaceId: string;

  const api = () => request(app.getHttpServer());

  const createWorkspace = async (user: TestUser, name: string) => {
    const response = await api()
      .post('/api/workspaces')
      .set(...bearer(user))
      .send({ name })
      .expect(201);
    return response.body.id as string;
  };

  const createProject = (
    actor: TestUser,
    body: object,
    workspace: string = workspaceId,
  ) =>
    api()
      .post(`/api/workspaces/${workspace}/projects`)
      .set(...bearer(actor))
      .send(body);

  const getProject = (actor: TestUser, projectId: string) =>
    api()
      .get(`/api/projects/${projectId}`)
      .set(...bearer(actor));

  const deleteProject = (actor: TestUser, projectId: string) =>
    api()
      .delete(`/api/projects/${projectId}`)
      .set(...bearer(actor));

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    owner = await registerUser(app, 'Owner');
    member = await registerUser(app, 'Member');
    outsider = await registerUser(app, 'Outsider');

    workspaceId = await createWorkspace(owner, 'Product team');
    await addMember(app, workspaceId, member);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/workspaces/:workspaceId/projects', () => {
    it('lets any member create a project', async () => {
      const response = await createProject(member, {
        name: '  Website  ',
        description: 'Marketing site',
      }).expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        workspaceId,
        name: 'Website',
        description: 'Marketing site',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('stores a missing description as null', async () => {
      const response = await createProject(owner, { name: 'Website' }).expect(
        201,
      );

      expect(response.body.description).toBeNull();
    });

    it('rejects a duplicate name inside the same workspace', async () => {
      await createProject(owner, { name: 'Website' }).expect(201);

      const response = await createProject(member, { name: 'Website' }).expect(
        409,
      );

      expect(response.body.message).toBe(
        'A project with this name already exists in the workspace',
      );
    });

    it('allows the same name in another workspace', async () => {
      const otherWorkspace = await createWorkspace(owner, 'Side project');
      await createProject(owner, { name: 'Website' }).expect(201);

      await createProject(owner, { name: 'Website' }, otherWorkspace).expect(
        201,
      );
    });

    it('rejects an empty name', async () => {
      await createProject(owner, { name: '  ' }).expect(400);
    });

    it('hides the workspace from non-members', async () => {
      await createProject(outsider, { name: 'Website' }).expect(404);
    });
  });

  describe('GET /api/workspaces/:workspaceId/projects', () => {
    it('lists the projects of the workspace, newest first', async () => {
      await createProject(owner, { name: 'First' }).expect(201);
      await createProject(owner, { name: 'Second' }).expect(201);

      const response = await api()
        .get(`/api/workspaces/${workspaceId}/projects`)
        .set(...bearer(member))
        .expect(200);

      expect(response.body.map((item: { name: string }) => item.name)).toEqual([
        'Second',
        'First',
      ]);
    });

    it('hides the list from non-members', async () => {
      await api()
        .get(`/api/workspaces/${workspaceId}/projects`)
        .set(...bearer(outsider))
        .expect(404);
    });
  });

  describe('GET /api/projects/:projectId', () => {
    it('returns a project to a workspace member', async () => {
      const created = await createProject(owner, { name: 'Website' });

      const response = await getProject(member, created.body.id).expect(200);

      expect(response.body).toMatchObject({ id: created.body.id });
    });

    it('hides a project from non-members', async () => {
      const created = await createProject(owner, { name: 'Website' });

      const response = await getProject(outsider, created.body.id).expect(404);

      expect(response.body.message).toBe('Project not found');
    });

    it('returns 404 for a project that does not exist', async () => {
      await getProject(owner, randomUUID()).expect(404);
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    it('lets an owner delete a project together with its tasks', async () => {
      const created = await createProject(owner, { name: 'Website' });
      const prisma = app.get(PrismaService);
      await prisma.task.create({
        data: {
          projectId: created.body.id,
          title: 'Write copy',
          creatorId: owner.id,
        },
      });

      await deleteProject(owner, created.body.id).expect(204);

      await getProject(owner, created.body.id).expect(404);
      expect(
        await prisma.task.count({ where: { projectId: created.body.id } }),
      ).toBe(0);
    });

    it('forbids members from deleting a project', async () => {
      const created = await createProject(member, { name: 'Website' });

      const response = await deleteProject(member, created.body.id).expect(403);

      expect(response.body.message).toBe(
        'Only workspace owners can delete projects',
      );
      await getProject(member, created.body.id).expect(200);
    });

    it('hides a project from non-members', async () => {
      const created = await createProject(owner, { name: 'Website' });

      await deleteProject(outsider, created.body.id).expect(404);
    });
  });
});
