import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createTestApp, resetDatabase } from './support/test-app.js';

describe('Critical flow: registration to first task (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a new user register, set up a project and create a task', async () => {
    const api = request(app.getHttpServer());

    const registration = await api
      .post('/api/auth/register')
      .send({
        email: 'founder@example.com',
        name: 'Founder',
        password: 'correct-horse-battery',
      })
      .expect(201);
    const auth = `Bearer ${registration.body.accessToken}`;
    const userId = registration.body.user.id;

    const workspace = await api
      .post('/api/workspaces')
      .set('Authorization', auth)
      .send({ name: 'Startup' })
      .expect(201);
    expect(workspace.body.role).toBe('OWNER');

    const project = await api
      .post(`/api/workspaces/${workspace.body.id}/projects`)
      .set('Authorization', auth)
      .send({ name: 'MVP' })
      .expect(201);

    const task = await api
      .post(`/api/projects/${project.body.id}/tasks`)
      .set('Authorization', auth)
      .send({ title: 'Ship the first version', assigneeId: userId })
      .expect(201);

    const stored = await api
      .get(`/api/tasks/${task.body.id}`)
      .set('Authorization', auth)
      .expect(200);

    expect(stored.body).toMatchObject({
      projectId: project.body.id,
      title: 'Ship the first version',
      status: 'TODO',
      assignee: { id: userId },
      creator: { id: userId },
    });
  });
});
