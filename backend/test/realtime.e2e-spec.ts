import type { NestExpressApplication } from '@nestjs/platform-express';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { bearer, registerUser, type TestUser } from './support/auth.js';
import { addMember } from './support/members.js';
import { createTestApp, resetDatabase } from './support/test-app.js';

const QUIET_PERIOD_MS = 300;

describe('Realtime board updates (e2e)', () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  let owner: TestUser;
  let member: TestUser;
  let outsider: TestUser;
  let projectId: string;
  let otherProjectId: string;
  const sockets: Socket[] = [];

  const api = () => request(app.getHttpServer());

  const connect = (token: string | undefined): Promise<Socket> =>
    new Promise((resolve, reject) => {
      const socket = io(baseUrl, {
        auth: token ? { token } : {},
        transports: ['websocket'],
        reconnection: false,
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', (error) => reject(error));
    });

  const join = (socket: Socket, project: unknown) =>
    socket.emitWithAck('project:join', { projectId: project });

  const nextEvent = <T>(socket: Socket, event: string): Promise<T> =>
    new Promise((resolve) => socket.once(event, resolve));

  const expectNoEvent = async (socket: Socket, event: string) => {
    const listener = vi.fn();
    socket.on(event, listener);
    await new Promise((resolve) => setTimeout(resolve, QUIET_PERIOD_MS));
    socket.off(event, listener);
    expect(listener).not.toHaveBeenCalled();
  };

  const createTask = (actor: TestUser, body: object, project = projectId) =>
    api()
      .post(`/api/projects/${project}/tasks`)
      .set(...bearer(actor))
      .send(body)
      .expect(201);

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0);
    baseUrl = await app.getUrl();
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
  });

  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('connection', () => {
    it('rejects a connection without a token', async () => {
      await expect(connect(undefined)).rejects.toThrow('Unauthorized');
    });

    it('rejects a connection with an invalid token', async () => {
      await expect(connect('not.a.jwt')).rejects.toThrow('Unauthorized');
    });

    it('accepts a connection with a valid access token', async () => {
      const socket = await connect(member.accessToken);

      expect(socket.connected).toBe(true);
    });
  });

  describe('joining a project', () => {
    it('lets a workspace member join', async () => {
      const socket = await connect(member.accessToken);

      expect(await join(socket, projectId)).toEqual({ ok: true });
    });

    it('refuses a user who is not a member', async () => {
      const socket = await connect(outsider.accessToken);

      expect(await join(socket, projectId)).toEqual({
        ok: false,
        error: 'Project not found',
      });
    });

    it('refuses a malformed project id', async () => {
      const socket = await connect(member.accessToken);

      expect(await join(socket, 'not-a-uuid')).toEqual({
        ok: false,
        error: 'Invalid project id',
      });
    });
  });

  describe('task events', () => {
    it('notifies members when another user changes the status', async () => {
      const task = await createTask(owner, { title: 'Write copy' });
      const socket = await connect(member.accessToken);
      await join(socket, projectId);

      const received = nextEvent<{ task: { id: string; status: string } }>(
        socket,
        'task.updated',
      );
      await api()
        .patch(`/api/tasks/${task.body.id}`)
        .set(...bearer(owner))
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect((await received).task).toMatchObject({
        id: task.body.id,
        status: 'IN_PROGRESS',
      });
    });

    it('notifies members when another user reassigns a task', async () => {
      const task = await createTask(owner, { title: 'Write copy' });
      const socket = await connect(member.accessToken);
      await join(socket, projectId);

      const received = nextEvent<{ task: { assignee: { id: string } } }>(
        socket,
        'task.updated',
      );
      await api()
        .patch(`/api/tasks/${task.body.id}`)
        .set(...bearer(owner))
        .send({ assigneeId: member.id })
        .expect(200);

      expect((await received).task.assignee).toMatchObject({ id: member.id });
    });

    it('notifies members about created and deleted tasks', async () => {
      const socket = await connect(member.accessToken);
      await join(socket, projectId);

      const created = nextEvent<{ task: { id: string; title: string } }>(
        socket,
        'task.created',
      );
      const task = await createTask(owner, { title: 'Write copy' });
      expect((await created).task).toMatchObject({
        id: task.body.id,
        title: 'Write copy',
      });

      const deleted = nextEvent<{ taskId: string; projectId: string }>(
        socket,
        'task.deleted',
      );
      await api()
        .delete(`/api/tasks/${task.body.id}`)
        .set(...bearer(owner))
        .expect(204);
      expect(await deleted).toEqual({ projectId, taskId: task.body.id });
    });

    it('does not leak events of other projects', async () => {
      const socket = await connect(member.accessToken);
      await join(socket, projectId);

      const silence = expectNoEvent(socket, 'task.created');
      await createTask(owner, { title: 'Elsewhere' }, otherProjectId);

      await silence;
    });

    it('sends nothing to a user whose join was refused', async () => {
      const socket = await connect(outsider.accessToken);
      await join(socket, projectId);

      const silence = expectNoEvent(socket, 'task.created');
      await createTask(owner, { title: 'Private' });

      await silence;
    });

    it('stops sending events after leaving the project', async () => {
      const socket = await connect(member.accessToken);
      await join(socket, projectId);
      await socket.emitWithAck('project:leave', { projectId });

      const silence = expectNoEvent(socket, 'task.created');
      await createTask(owner, { title: 'After leaving' });

      await silence;
    });
  });
});
