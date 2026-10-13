import type { NestExpressApplication } from '@nestjs/platform-express';
import type pg from 'pg';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { bearer, registerUser, type TestUser } from './support/auth.js';
import { openConnection, pause } from './support/database.js';
import { addMember } from './support/members.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

const REQUEST_HEAD_START_MS = 300;

describe('Checks under concurrent changes (e2e)', () => {
  let app: NestExpressApplication;
  let db: pg.Client;
  let owner: TestUser;
  let member: TestUser;
  let secondOwner: TestUser;
  let workspaceId: string;
  let projectId: string;
  let taskId: string;

  const api = () => request(app.getHttpServer());

  const lockWorkspace = async () => {
    await db.query('BEGIN');
    await db.query('SELECT id FROM workspaces WHERE id = $1 FOR UPDATE', [
      workspaceId,
    ]);
  };

  const removeMemberInOpenTransaction = (userId: string) =>
    db.query(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId],
    );

  const demoteInOpenTransaction = (userId: string) =>
    db.query(
      `UPDATE workspace_members SET role = 'MEMBER'
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId],
    );

  const commitAfter = async <T>(pending: Promise<T>): Promise<T> => {
    await pause(REQUEST_HEAD_START_MS);
    await db.query('COMMIT');
    return pending;
  };

  beforeAll(async () => {
    app = await createTestApp();
    db = await openConnection();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    owner = await registerUser(app, 'Owner');
    member = await registerUser(app, 'Member');
    secondOwner = await registerUser(app, 'Second');

    const workspace = await api()
      .post('/api/workspaces')
      .set(...bearer(owner))
      .send({ name: 'Product team' })
      .expect(201);
    workspaceId = workspace.body.id;
    await addMember(app, workspaceId, member);
    await app.get(PrismaService).workspaceMember.create({
      data: { workspaceId, userId: secondOwner.id, role: 'OWNER' },
    });

    const project = await api()
      .post(`/api/workspaces/${workspaceId}/projects`)
      .set(...bearer(owner))
      .send({ name: 'Website' })
      .expect(201);
    projectId = project.body.id;

    const task = await api()
      .post(`/api/projects/${projectId}/tasks`)
      .set(...bearer(owner))
      .send({ title: 'Write copy' })
      .expect(201);
    taskId = task.body.id;
  });

  afterEach(async () => {
    await db.query('ROLLBACK');
  });

  afterAll(async () => {
    await db.end();
    await app.close();
  });

  it('refuses to assign a task to a member who is being removed', async () => {
    await lockWorkspace();
    await removeMemberInOpenTransaction(member.id);

    const response = await commitAfter(
      api()
        .patch(`/api/tasks/${taskId}`)
        .set(...bearer(owner))
        .send({ assigneeId: member.id })
        .then((result) => result),
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Assignee must be a member of the workspace',
    );
    const task = await app
      .get(PrismaService)
      .task.findUniqueOrThrow({ where: { id: taskId } });
    expect(task.assigneeId).toBeNull();
  });

  it('refuses to create a task for a member who is being removed', async () => {
    await lockWorkspace();
    await removeMemberInOpenTransaction(member.id);

    const response = await commitAfter(
      api()
        .post(`/api/projects/${projectId}/tasks`)
        .set(...bearer(owner))
        .send({ title: 'Review copy', assigneeId: member.id })
        .then((result) => result),
    );

    expect(response.status).toBe(400);
    const tasks = await app
      .get(PrismaService)
      .task.count({ where: { assigneeId: member.id } });
    expect(tasks).toBe(0);
  });

  it('refuses a removal by an owner who is being demoted', async () => {
    await lockWorkspace();
    await demoteInOpenTransaction(secondOwner.id);

    const response = await commitAfter(
      api()
        .delete(`/api/workspaces/${workspaceId}/members/${member.id}`)
        .set(...bearer(secondOwner))
        .then((result) => result),
    );

    expect(response.status).toBe(403);
    const members = await app
      .get(PrismaService)
      .workspaceMember.count({ where: { workspaceId } });
    expect(members).toBe(3);
  });

  it('refuses a role change by an owner who is being demoted', async () => {
    await lockWorkspace();
    await demoteInOpenTransaction(secondOwner.id);

    const response = await commitAfter(
      api()
        .patch(`/api/workspaces/${workspaceId}/members/${member.id}`)
        .set(...bearer(secondOwner))
        .send({ role: 'OWNER' })
        .then((result) => result),
    );

    expect(response.status).toBe(403);
    const promoted = await app
      .get(PrismaService)
      .workspaceMember.findUniqueOrThrow({
        where: { workspaceId_userId: { workspaceId, userId: member.id } },
      });
    expect(promoted.role).toBe('MEMBER');
  });
});
