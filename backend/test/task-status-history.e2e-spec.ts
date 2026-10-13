import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { bearer, registerUser, type TestUser } from './support/auth.js';
import { addMember } from './support/members.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

describe('Task status history (e2e)', () => {
  let app: NestExpressApplication;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let taskId: string;

  const api = () => request(app.getHttpServer());

  const updateTask = (actor: TestUser, body: object) =>
    api()
      .patch(`/api/tasks/${taskId}`)
      .set(...bearer(actor))
      .send(body);

  const getHistory = (actor: TestUser) =>
    api()
      .get(`/api/tasks/${taskId}/status-history`)
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
    await addMember(app, workspace.body.id, member);
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

  it('starts empty for a new task', async () => {
    const response = await getHistory(owner).expect(200);

    expect(response.body).toEqual([]);
  });

  it('records who changed the status, when, and from what to what', async () => {
    await updateTask(member, { status: 'IN_PROGRESS' }).expect(200);
    await updateTask(owner, { status: 'DONE' }).expect(200);

    const response = await getHistory(member).expect(200);

    expect(response.body).toEqual([
      {
        id: expect.any(String),
        fromStatus: 'IN_PROGRESS',
        toStatus: 'DONE',
        changedBy: { id: owner.id, name: owner.name, email: owner.email },
        changedAt: expect.any(String),
      },
      {
        id: expect.any(String),
        fromStatus: 'TODO',
        toStatus: 'IN_PROGRESS',
        changedBy: { id: member.id, name: member.name, email: member.email },
        changedAt: expect.any(String),
      },
    ]);
  });

  it('ignores updates that do not touch the status', async () => {
    await updateTask(owner, { title: 'Write better copy', priority: 'HIGH' });

    const response = await getHistory(owner).expect(200);

    expect(response.body).toEqual([]);
  });

  it('ignores an update to the status the task already has', async () => {
    await updateTask(owner, { status: 'TODO' }).expect(200);

    const response = await getHistory(owner).expect(200);

    expect(response.body).toEqual([]);
  });

  it('keeps one consistent chain under concurrent changes', async () => {
    await Promise.all([
      updateTask(owner, { status: 'IN_PROGRESS' }),
      updateTask(member, { status: 'DONE' }),
    ]);

    const response = await getHistory(owner).expect(200);
    const task = await api()
      .get(`/api/tasks/${taskId}`)
      .set(...bearer(owner))
      .expect(200);

    const chain = [...response.body].reverse() as {
      fromStatus: string;
      toStatus: string;
    }[];
    expect(chain[0].fromStatus).toBe('TODO');
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].fromStatus).toBe(chain[i - 1].toStatus);
    }
    expect(chain.at(-1)?.toStatus).toBe(task.body.status);
  });

  it('is removed together with the task', async () => {
    await updateTask(owner, { status: 'DONE' }).expect(200);

    await api()
      .delete(`/api/tasks/${taskId}`)
      .set(...bearer(owner))
      .expect(204);

    const remaining = await app
      .get(PrismaService)
      .taskStatusChange.count({ where: { taskId } });
    expect(remaining).toBe(0);
  });

  it('hides the history from non-members', async () => {
    await getHistory(outsider).expect(404);
  });
});
