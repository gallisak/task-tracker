import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { bearer, registerUser, type TestUser } from './support/auth.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

describe('Tasks (e2e)', () => {
  let app: NestExpressApplication;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let projectId: string;

  const api = () => request(app.getHttpServer());

  const createTask = (actor: TestUser, body: object, project = projectId) =>
    api()
      .post(`/api/projects/${project}/tasks`)
      .set(...bearer(actor))
      .send(body);

  const getTask = (actor: TestUser, taskId: string) =>
    api()
      .get(`/api/tasks/${taskId}`)
      .set(...bearer(actor));

  const updateTask = (actor: TestUser, taskId: string, body: object) =>
    api()
      .patch(`/api/tasks/${taskId}`)
      .set(...bearer(actor))
      .send(body);

  const deleteTask = (actor: TestUser, taskId: string) =>
    api()
      .delete(`/api/tasks/${taskId}`)
      .set(...bearer(actor));

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    owner = await registerUser(app, 'Owner');
    member = await registerUser(app, 'Member');
    outsider = await registerUser(app, 'Outsider');

    const workspace = await api()
      .post('/api/workspaces')
      .set(...bearer(owner))
      .send({ name: 'Product team' })
      .expect(201);
    await api()
      .post(`/api/workspaces/${workspace.body.id}/invitations`)
      .set(...bearer(owner))
      .send({ email: member.email })
      .expect(201);
    const project = await api()
      .post(`/api/workspaces/${workspace.body.id}/projects`)
      .set(...bearer(owner))
      .send({ name: 'Website' })
      .expect(201);
    projectId = project.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/projects/:projectId/tasks', () => {
    it('creates a task with defaults', async () => {
      const response = await createTask(member, {
        title: '  Write copy  ',
      }).expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        projectId,
        title: 'Write copy',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: null,
        assignee: null,
        creator: { id: member.id, name: member.name, email: member.email },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('creates a task with every field set', async () => {
      const response = await createTask(owner, {
        title: 'Write copy',
        description: 'Landing page text',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        assigneeId: member.id,
        dueDate: '2026-12-01T10:00:00.000Z',
      }).expect(201);

      expect(response.body).toMatchObject({
        description: 'Landing page text',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        dueDate: '2026-12-01T10:00:00.000Z',
        assignee: { id: member.id },
        creator: { id: owner.id },
      });
    });

    it('reports every invalid field', async () => {
      const response = await createTask(owner, {
        title: '   ',
        status: 'BLOCKED',
        priority: 'HIGHEST',
        assigneeId: 'not-a-uuid',
        dueDate: 'tomorrow',
      }).expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          'title should not be empty',
          'assigneeId must be a UUID',
          'dueDate must be a valid ISO 8601 date string',
          'dueDate must start with a calendar date (YYYY-MM-DD)',
        ]),
      );
      expect(response.body.details).toHaveLength(6);
    });

    it('rejects null for the status and the priority', async () => {
      await createTask(owner, { title: 'Write copy', status: null }).expect(
        400,
      );
      await createTask(owner, { title: 'Write copy', priority: null }).expect(
        400,
      );
    });

    it('rejects a due date that is not a real calendar date', async () => {
      await createTask(owner, {
        title: 'Write copy',
        dueDate: '2026-W10',
      }).expect(400);
      await createTask(owner, {
        title: 'Write copy',
        dueDate: '2026-02-31',
      }).expect(400);
    });

    it('strips null bytes from text', async () => {
      const response = await createTask(owner, {
        title: 'Write\u0000 copy',
      }).expect(201);

      expect(response.body.title).toBe('Write copy');
    });

    it('rejects an assignee who is not a workspace member', async () => {
      const response = await createTask(owner, {
        title: 'Write copy',
        assigneeId: outsider.id,
      }).expect(400);

      expect(response.body.message).toBe(
        'Assignee must be a member of the workspace',
      );
    });

    it('hides the project from non-members', async () => {
      await createTask(outsider, { title: 'Write copy' }).expect(404);
    });

    it('returns 404 for a project that does not exist', async () => {
      await createTask(owner, { title: 'Write copy' }, randomUUID()).expect(
        404,
      );
    });
  });

  describe('GET /api/tasks/:taskId', () => {
    it('returns a task to a workspace member', async () => {
      const created = await createTask(owner, { title: 'Write copy' });

      const response = await getTask(member, created.body.id).expect(200);

      expect(response.body).toMatchObject({
        id: created.body.id,
        title: 'Write copy',
      });
    });

    it('hides a task from non-members', async () => {
      const created = await createTask(owner, { title: 'Write copy' });

      const response = await getTask(outsider, created.body.id).expect(404);

      expect(response.body.message).toBe('Task not found');
    });
  });

  describe('PATCH /api/tasks/:taskId', () => {
    let taskId: string;

    beforeEach(async () => {
      const created = await createTask(owner, {
        title: 'Write copy',
        description: 'Landing page text',
        assigneeId: member.id,
        dueDate: '2026-12-01T10:00:00.000Z',
      }).expect(201);
      taskId = created.body.id;
    });

    it('changes only the fields that were sent', async () => {
      const response = await updateTask(member, taskId, {
        status: 'DONE',
        priority: 'LOW',
      }).expect(200);

      expect(response.body).toMatchObject({
        title: 'Write copy',
        description: 'Landing page text',
        status: 'DONE',
        priority: 'LOW',
        assignee: { id: member.id },
        dueDate: '2026-12-01T10:00:00.000Z',
      });
    });

    it('clears the assignee, description and due date with null', async () => {
      const response = await updateTask(owner, taskId, {
        assigneeId: null,
        description: null,
        dueDate: null,
      }).expect(200);

      expect(response.body).toMatchObject({
        assignee: null,
        description: null,
        dueDate: null,
      });
    });

    it('refuses to clear required fields', async () => {
      const response = await updateTask(owner, taskId, {
        title: null,
        status: null,
      }).expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining(['title should not be empty']),
      );
    });

    it('rejects an assignee who is not a workspace member', async () => {
      await updateTask(owner, taskId, { assigneeId: outsider.id }).expect(400);
    });

    it('rejects fields that cannot be changed', async () => {
      const response = await updateTask(owner, taskId, {
        projectId: randomUUID(),
      }).expect(400);

      expect(response.body.details).toContain(
        'property projectId should not exist',
      );
    });

    it('hides a task from non-members', async () => {
      await updateTask(outsider, taskId, { status: 'DONE' }).expect(404);
    });
  });

  describe('DELETE /api/tasks/:taskId', () => {
    it('lets any member delete a task', async () => {
      const created = await createTask(owner, { title: 'Write copy' });

      await deleteTask(member, created.body.id).expect(204);

      await getTask(owner, created.body.id).expect(404);
    });

    it('hides a task from non-members', async () => {
      const created = await createTask(owner, { title: 'Write copy' });

      await deleteTask(outsider, created.body.id).expect(404);
      await getTask(owner, created.body.id).expect(200);
    });
  });
});
