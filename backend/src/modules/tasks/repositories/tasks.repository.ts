import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  Task,
  TaskPriority,
  TaskStatus,
  User,
} from '../../../generated/prisma/client.js';

export type TaskWithUsers = Task & { assignee: User | null; creator: User };

export interface TaskAccess {
  task: TaskWithUsers;
  workspaceId: string;
}

export interface CreateTaskData {
  projectId: string;
  creatorId: string;
  title: string;
  description: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId: string | null;
  dueDate: Date | null;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: Date | null;
}

const WITH_USERS = { assignee: true, creator: true } as const;

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTaskData): Promise<TaskWithUsers> {
    return this.prisma.task.create({ data, include: WITH_USERS });
  }

  async findForUser(
    taskId: string,
    userId: string,
  ): Promise<TaskAccess | null> {
    const found = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: { workspace: { members: { some: { userId } } } },
      },
      include: { ...WITH_USERS, project: { select: { workspaceId: true } } },
    });
    if (!found) {
      return null;
    }

    const { project, ...task } = found;
    return { task, workspaceId: project.workspaceId };
  }

  update(taskId: string, data: UpdateTaskData): Promise<TaskWithUsers> {
    return this.prisma.task.update({
      where: { id: taskId },
      data,
      include: WITH_USERS,
    });
  }

  async delete(taskId: string): Promise<void> {
    await this.prisma.task.delete({ where: { id: taskId } });
  }
}
