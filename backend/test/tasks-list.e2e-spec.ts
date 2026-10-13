import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { bearer, registerUser, type TestUser } from './support/auth.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

interface ListedTask {
  title: string;
}

describe('Task list (e2e)', () => {
  let app: NestExpressApplication;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let projectId: string;
  let otherProjectId: string;

  const api = () => request(app.getHttpServer());

  const createTask = (body: object, project = projectId) =>
    api()
      .post(`/api/projects/${project}/tasks`)
      .set(...bearer(owner))
      .send(body)
      .expect(201);

  const listTasks = (query: object = {}, actor = owner) =>
    api()
      .get(`/api/projects/${projectId}/tasks`)
      .set(...bearer(actor))
      .query(query);

  const titles = (response: request.Response) =>
    (response.body.items as ListedTask[]).map((task) => task.title);

  beforeAll(async () => {
    app = await createTestApp();
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

    const createProject = async (name: string) => {
      const project = await api()
        .post(`/api/workspaces/${workspace.body.id}/projects`)
        .set(...bearer(owner))
        .send({ name })
        .expect(201);
      return project.body.id as string;
    };
    projectId = await createProject('Website');
    otherProjectId = await createProject('Mobile app');

    await createTask({ title: 'A', status: 'TODO', priority: 'LOW' });
    await createTask({
      title: 'B',
      status: 'TODO',
      priority: 'HIGH',
      assigneeId: member.id,
    });
    await createTask({
      title: 'C',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: owner.id,
    });
    await createTask({
      title: 'D',
      status: 'DONE',
      priority: 'MEDIUM',
      assigneeId: member.id,
    });
    await createTask({ title: 'E', status: 'DONE', priority: 'HIGH' });
    await createTask({ title: 'Foreign', status: 'TODO' }, otherProjectId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the tasks of the project only, newest first', async () => {
    const response = await listTasks().expect(200);

    expect(titles(response)).toEqual(['E', 'D', 'C', 'B', 'A']);
    expect(response.body).toMatchObject({
      total: 5,
      limit: 20,
      nextCursor: null,
    });
  });

  it('filters by status', async () => {
    const response = await listTasks({ status: 'DONE' }).expect(200);

    expect(titles(response)).toEqual(['E', 'D']);
    expect(response.body.total).toBe(2);
  });

  it('filters by priority', async () => {
    const response = await listTasks({ priority: 'HIGH' }).expect(200);

    expect(titles(response)).toEqual(['E', 'C', 'B']);
  });

  it('filters by assignee', async () => {
    const response = await listTasks({ assigneeId: member.id }).expect(200);

    expect(titles(response)).toEqual(['D', 'B']);
  });

  it('combines filters', async () => {
    const response = await listTasks({
      status: 'TODO',
      priority: 'HIGH',
      assigneeId: member.id,
    }).expect(200);

    expect(titles(response)).toEqual(['B']);
  });

  it('returns an empty page when nothing matches', async () => {
    const response = await listTasks({
      status: 'IN_PROGRESS',
      priority: 'LOW',
    }).expect(200);

    expect(response.body).toMatchObject({
      items: [],
      total: 0,
      nextCursor: null,
    });
  });

  it('splits the result into pages', async () => {
    const first = await listTasks({ limit: 2 }).expect(200);
    const second = await listTasks({
      limit: 2,
      cursor: first.body.nextCursor,
    }).expect(200);
    const third = await listTasks({
      limit: 2,
      cursor: second.body.nextCursor,
    }).expect(200);

    expect(titles(first)).toEqual(['E', 'D']);
    expect(titles(second)).toEqual(['C', 'B']);
    expect(titles(third)).toEqual(['A']);
    expect(second.body).toMatchObject({ total: 5, limit: 2 });
    expect(third.body.nextCursor).toBeNull();
  });

  it('pages within the filtered set', async () => {
    const first = await listTasks({ priority: 'HIGH', limit: 2 }).expect(200);
    const second = await listTasks({
      priority: 'HIGH',
      limit: 2,
      cursor: first.body.nextCursor,
    }).expect(200);

    expect(first.body.total).toBe(3);
    expect(titles(first)).toEqual(['E', 'C']);
    expect(titles(second)).toEqual(['B']);
    expect(second.body.nextCursor).toBeNull();
  });

  it('ends exactly at the last task without an empty extra page', async () => {
    const response = await listTasks({ limit: 5 }).expect(200);

    expect(titles(response)).toHaveLength(5);
    expect(response.body.nextCursor).toBeNull();
  });

  it('does not skip or repeat tasks when the list changes between pages', async () => {
    const first = await listTasks({ limit: 2 }).expect(200);
    const added = await createTask({ title: 'Late arrival' });

    const second = await listTasks({
      limit: 2,
      cursor: first.body.nextCursor,
    }).expect(200);
    await api()
      .delete(`/api/tasks/${added.body.id}`)
      .set(...bearer(owner))
      .expect(204);

    expect(titles(second)).toEqual(['C', 'B']);
  });

  it('rejects a cursor it did not issue', async () => {
    const response = await listTasks({ cursor: 'page-2' }).expect(400);

    expect(response.body.message).toBe('Invalid cursor');
  });

  it('rejects invalid filters and paging parameters', async () => {
    const response = await listTasks({
      status: 'BLOCKED',
      priority: 'HIGHEST',
      assigneeId: 'me',
      limit: 101,
    }).expect(400);

    expect(response.body.details).toEqual(
      expect.arrayContaining([
        'assigneeId must be a UUID',
        'limit must not be greater than 100',
      ]),
    );
    expect(response.body.details).toHaveLength(4);
  });

  it('rejects the offset parameter of the old paging scheme', async () => {
    await listTasks({ page: 2 }).expect(400);
  });

  it('rejects unknown query parameters', async () => {
    await listTasks({ sort: 'title' }).expect(400);
  });

  it('lets any member read the list', async () => {
    await listTasks({}, member).expect(200);
  });

  it('hides the project from non-members', async () => {
    await listTasks({}, outsider).expect(404);
  });
});
