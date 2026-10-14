import { NotFoundException } from '@nestjs/common';
import type { TokenService } from '../../auth/services/token.service.js';
import type { ProjectAccessService } from '../../projects/services/project-access.service.js';
import { TasksGateway } from './tasks.gateway.js';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

type ConnectedSocket = Parameters<TasksGateway['handleConnection']>[0];

const PROJECT_ID = '01a135b9-fdb4-749f-9af0-4af1c704a591';
const WORKSPACE_ID = 'workspace-1';

describe('TasksGateway connection lifetime', () => {
  const gateway = new TasksGateway(
    {} as TokenService,
    {} as ProjectAccessService,
  );

  const connect = async (tokenLifetimeMs: number) => {
    const socket = {
      data: {
        user: { id: 'user-1', email: 'user-1@example.com' },
        tokenExpiresAt: Date.now() + tokenLifetimeMs,
        workspaceByProject: new Map<string, string>(),
      },
      disconnect: vi.fn(),
      once: vi.fn(),
      join: vi.fn().mockResolvedValue(undefined),
    };
    await gateway.handleConnection(socket as unknown as ConnectedSocket);
    return socket;
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('disconnects when a short-lived token expires', async () => {
    const socket = await connect(15 * MINUTE_MS);

    vi.advanceTimersByTime(15 * MINUTE_MS - 1);
    expect(socket.disconnect).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('keeps a socket open past the longest timer delay while its token is valid', async () => {
    const socket = await connect(30 * DAY_MS);

    vi.advanceTimersByTime(25 * DAY_MS);
    expect(socket.disconnect).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5 * DAY_MS);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects at once when the token has already expired', async () => {
    const socket = await connect(-1000);

    vi.advanceTimersByTime(1);

    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('stops the timer once the socket is gone', async () => {
    const socket = await connect(30 * DAY_MS);
    const [event, onDisconnect] = socket.once.mock.calls[0] as [
      string,
      () => void,
    ];
    expect(event).toBe('disconnect');

    vi.advanceTimersByTime(25 * DAY_MS);
    onDisconnect();
    vi.advanceTimersByTime(10 * DAY_MS);

    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it('puts the socket in the room of its user', async () => {
    const socket = await connect(15 * MINUTE_MS);

    expect(socket.join).toHaveBeenCalledWith('user:user-1');
  });
});

describe('TasksGateway joining a project', () => {
  const projectAccess = { requireProject: vi.fn() };
  const gateway = new TasksGateway(
    {} as TokenService,
    projectAccess as unknown as ProjectAccessService,
  );

  const socket = () => ({
    data: {
      user: { id: 'user-1', email: 'user-1@example.com' },
      tokenExpiresAt: Date.now() + MINUTE_MS,
      workspaceByProject: new Map<string, string>(),
    },
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
  });

  const membership = {
    project: { id: PROJECT_ID, workspaceId: WORKSPACE_ID },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('puts a member in the room of the project', async () => {
    projectAccess.requireProject.mockResolvedValue(membership);
    const member = socket();

    const result = await gateway.joinProject(
      member as unknown as ConnectedSocket,
      { projectId: PROJECT_ID },
    );

    expect(result).toEqual({ ok: true });
    expect(member.join).toHaveBeenCalledWith(`project:${PROJECT_ID}`);
    expect(member.data.workspaceByProject.get(PROJECT_ID)).toBe(WORKSPACE_ID);
    expect(member.leave).not.toHaveBeenCalled();
  });

  it('backs out when the membership is removed while joining', async () => {
    projectAccess.requireProject
      .mockResolvedValueOnce(membership)
      .mockRejectedValueOnce(new NotFoundException('Project not found'));
    const member = socket();

    const result = await gateway.joinProject(
      member as unknown as ConnectedSocket,
      { projectId: PROJECT_ID },
    );

    expect(result).toEqual({ ok: false, error: 'Project not found' });
    expect(member.leave).toHaveBeenCalledWith(`project:${PROJECT_ID}`);
    expect(member.data.workspaceByProject.size).toBe(0);
  });

  it('refuses a user without access before touching any room', async () => {
    projectAccess.requireProject.mockRejectedValue(
      new NotFoundException('Project not found'),
    );
    const outsider = socket();

    const result = await gateway.joinProject(
      outsider as unknown as ConnectedSocket,
      { projectId: PROJECT_ID },
    );

    expect(result).toEqual({ ok: false, error: 'Project not found' });
    expect(outsider.join).not.toHaveBeenCalled();
  });
});
