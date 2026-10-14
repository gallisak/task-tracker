import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import type { Server, Socket } from 'socket.io';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator.js';
import { TokenService } from '../../auth/services/token.service.js';
import { ProjectAccessService } from '../../projects/services/project-access.service.js';
import {
  MEMBER_REMOVED_EVENT,
  type MemberRemovedEvent,
} from '../../workspaces/events/member-removed.event.js';
import { TaskResponseDto } from '../dto/task-response.dto.js';
import type { TaskWithUsers } from '../repositories/tasks.repository.js';

export const TaskEvent = {
  Created: 'task.created',
  Updated: 'task.updated',
  Deleted: 'task.deleted',
} as const;

export interface JoinResult {
  ok: boolean;
  error?: string;
}

interface SocketData {
  user: AuthenticatedUser;
  tokenExpiresAt: number;
  workspaceByProject: Map<string, string>;
}

type AuthenticatedSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  SocketData
>;

const projectRoom = (projectId: string) => `project:${projectId}`;
const userRoom = (userId: string) => `user:${userId}`;
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;
const PROJECT_NOT_FOUND: JoinResult = { ok: false, error: 'Project not found' };

@WebSocketGateway()
export class TasksGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(TasksGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly tokens: TokenService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket: AuthenticatedSocket, next) => {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== 'string') {
        next(new Error('Unauthorized'));
        return;
      }

      this.tokens
        .verifyAccess(token)
        .then((payload) => {
          socket.data.user = { id: payload.sub, email: payload.email };
          socket.data.tokenExpiresAt = payload.exp * 1000;
          socket.data.workspaceByProject = new Map();
          next();
        })
        .catch(() => next(new Error('Unauthorized')));
    });
  }

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    let expiry: NodeJS.Timeout;
    const waitForExpiry = () => {
      const remaining = socket.data.tokenExpiresAt - Date.now();
      expiry = setTimeout(
        remaining > MAX_TIMER_DELAY_MS
          ? waitForExpiry
          : () => socket.disconnect(true),
        Math.min(remaining, MAX_TIMER_DELAY_MS),
      );
    };
    waitForExpiry();
    socket.once('disconnect', () => clearTimeout(expiry));
    await socket.join(userRoom(socket.data.user.id));
  }

  @OnEvent(MEMBER_REMOVED_EVENT)
  async removeFromWorkspaceRooms({
    workspaceId,
    userId,
  }: MemberRemovedEvent): Promise<void> {
    const sockets = await this.server.in(userRoom(userId)).fetchSockets();
    for (const socket of sockets) {
      const { workspaceByProject } = socket.data as SocketData;
      for (const [projectId, joinedWorkspaceId] of workspaceByProject) {
        if (joinedWorkspaceId === workspaceId) {
          socket.leave(projectRoom(projectId));
          workspaceByProject.delete(projectId);
        }
      }
    }
  }

  @SubscribeMessage('project:join')
  async joinProject(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { projectId?: unknown } | undefined,
  ): Promise<JoinResult> {
    const projectId = body?.projectId;
    if (typeof projectId !== 'string' || !isUUID(projectId)) {
      return { ok: false, error: 'Invalid project id' };
    }

    const userId = socket.data.user.id;
    const workspaceId = await this.findWorkspaceOf(projectId, userId);
    if (!workspaceId) {
      return PROJECT_NOT_FOUND;
    }

    socket.data.workspaceByProject.set(projectId, workspaceId);
    await socket.join(projectRoom(projectId));

    if (!(await this.findWorkspaceOf(projectId, userId))) {
      socket.data.workspaceByProject.delete(projectId);
      await socket.leave(projectRoom(projectId));
      return PROJECT_NOT_FOUND;
    }
    return { ok: true };
  }

  @SubscribeMessage('project:leave')
  async leaveProject(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { projectId?: unknown } | undefined,
  ): Promise<JoinResult> {
    if (typeof body?.projectId === 'string') {
      socket.data.workspaceByProject.delete(body.projectId);
      await socket.leave(projectRoom(body.projectId));
    }
    return { ok: true };
  }

  taskCreated(task: TaskWithUsers): void {
    this.broadcast(task.projectId, TaskEvent.Created, {
      task: TaskResponseDto.from(task),
    });
  }

  taskUpdated(task: TaskWithUsers): void {
    this.broadcast(task.projectId, TaskEvent.Updated, {
      task: TaskResponseDto.from(task),
    });
  }

  taskDeleted(projectId: string, taskId: string): void {
    this.broadcast(projectId, TaskEvent.Deleted, { projectId, taskId });
  }

  private async findWorkspaceOf(
    projectId: string,
    userId: string,
  ): Promise<string | null> {
    try {
      const { project } = await this.projectAccess.requireProject(
        projectId,
        userId,
      );
      return project.workspaceId;
    } catch {
      return null;
    }
  }

  private broadcast(projectId: string, event: string, payload: object): void {
    try {
      this.server.to(projectRoom(projectId)).emit(event, payload);
    } catch (error) {
      this.logger.error(
        `Failed to broadcast ${event} for project ${projectId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
