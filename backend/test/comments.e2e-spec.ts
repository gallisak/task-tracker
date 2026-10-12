import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { bearer, registerUser, type TestUser } from './support/auth.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

describe('Comments (e2e)', () => {
  let app: NestExpressApplication;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let taskId: string;

  const api = () => request(app.getHttpServer());

  const addComment = (actor: TestUser, body: object, task = taskId) =>
    api()
      .post(`/api/tasks/${task}/comments`)
      .set(...bearer(actor))
      .send(body);

  const listComments = (actor: TestUser) =>
    api()
      .get(`/api/tasks/${taskId}/comments`)
      .set(...bearer(actor));

  const editComment = (actor: TestUser, commentId: string, body: object) =>
    api()
      .patch(`/api/comments/${commentId}`)
      .set(...bearer(actor))
      .send(body);

  const deleteComment = (actor: TestUser, commentId: string) =>
    api()
      .delete(`/api/comments/${commentId}`)
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
    const task = await api()
      .post(`/api/projects/${project.body.id}/tasks`)
      .set(...bearer(owner))
      .send({ title: 'Write copy' })
      .expect(201);
    taskId = task.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/tasks/:taskId/comments', () => {
    it('adds a comment on behalf of the current user', async () => {
      const response = await addComment(member, {
        body: '  Looks good  ',
      }).expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        taskId,
        body: 'Looks good',
        author: { id: member.id, name: member.name, email: member.email },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('stores markup as plain text', async () => {
      const body = '<script>alert(1)</script>';

      const response = await addComment(owner, { body }).expect(201);

      expect(response.body.body).toBe(body);
    });

    it('rejects an empty or oversized body', async () => {
      await addComment(owner, { body: '   ' }).expect(400);
      await addComment(owner, { body: 'x'.repeat(2001) }).expect(400);
    });

    it('rejects an attempt to post as someone else', async () => {
      const response = await addComment(member, {
        body: 'Hi',
        authorId: owner.id,
      }).expect(400);

      expect(response.body.details).toContain(
        'property authorId should not exist',
      );
    });

    it('hides the task from non-members', async () => {
      await addComment(outsider, { body: 'Hi' }).expect(404);
    });

    it('returns 404 for a task that does not exist', async () => {
      await addComment(owner, { body: 'Hi' }, randomUUID()).expect(404);
    });
  });

  describe('GET /api/tasks/:taskId/comments', () => {
    it('lists comments in the order they were written', async () => {
      await addComment(owner, { body: 'First' }).expect(201);
      await addComment(member, { body: 'Second' }).expect(201);

      const response = await listComments(member).expect(200);

      expect(
        response.body.map((comment: { body: string }) => comment.body),
      ).toEqual(['First', 'Second']);
    });

    it('hides comments from non-members', async () => {
      await listComments(outsider).expect(404);
    });
  });

  describe('PATCH /api/comments/:commentId', () => {
    it('lets the author edit the comment', async () => {
      const created = await addComment(member, { body: 'Draft' });

      const response = await editComment(member, created.body.id, {
        body: 'Final',
      }).expect(200);

      expect(response.body).toMatchObject({
        id: created.body.id,
        body: 'Final',
      });
    });

    it('forbids other members, including owners, from editing', async () => {
      const created = await addComment(member, { body: 'Draft' });

      const response = await editComment(owner, created.body.id, {
        body: 'Hijacked',
      }).expect(403);

      expect(response.body.message).toBe(
        'Only the author can change this comment',
      );
    });

    it('rejects an empty body', async () => {
      const created = await addComment(member, { body: 'Draft' });

      await editComment(member, created.body.id, { body: '' }).expect(400);
    });

    it('hides the comment from non-members', async () => {
      const created = await addComment(member, { body: 'Draft' });

      await editComment(outsider, created.body.id, { body: 'x' }).expect(404);
    });
  });

  describe('DELETE /api/comments/:commentId', () => {
    it('lets the author delete the comment', async () => {
      const created = await addComment(member, { body: 'Draft' });

      await deleteComment(member, created.body.id).expect(204);

      const remaining = await listComments(member).expect(200);
      expect(remaining.body).toEqual([]);
    });

    it('forbids other members from deleting', async () => {
      const created = await addComment(member, { body: 'Draft' });

      await deleteComment(owner, created.body.id).expect(403);
    });

    it('returns 404 for a comment that does not exist', async () => {
      await deleteComment(owner, randomUUID()).expect(404);
    });

    it('removes comments together with their task', async () => {
      await addComment(member, { body: 'Draft' }).expect(201);

      await api()
        .delete(`/api/tasks/${taskId}`)
        .set(...bearer(owner))
        .expect(204);

      expect(
        await app.get(PrismaService).comment.count({ where: { taskId } }),
      ).toBe(0);
    });
  });
});
