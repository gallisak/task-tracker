import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
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

type AuthenticatedSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  { user: AuthenticatedUser }
>;

const projectRoom = (projectId: string) => `project:${projectId}`;

@WebSocketGateway()
export class TasksGateway implements OnGatewayInit {
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
          next();
        })
        .catch(() => next(new Error('Unauthorized')));
    });
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

    try {
      await this.projectAccess.requireProject(projectId, socket.data.user.id);
    } catch {
      return { ok: false, error: 'Project not found' };
    }

    await socket.join(projectRoom(projectId));
    return { ok: true };
  }

  @SubscribeMessage('project:leave')
  async leaveProject(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { projectId?: unknown } | undefined,
  ): Promise<JoinResult> {
    if (typeof body?.projectId === 'string') {
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
