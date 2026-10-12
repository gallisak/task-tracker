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

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
}

export interface PageRequest {
  skip: number;
  take: number;
}

const WITH_USERS = { assignee: true, creator: true } as const;

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTaskData): Promise<TaskWithUsers> {
    return this.prisma.task.create({ data, include: WITH_USERS });
  }

  async findPage(
    projectId: string,
    filters: TaskFilters,
    page: PageRequest,
  ): Promise<{ items: TaskWithUsers[]; total: number }> {
    const where = { projectId, ...filters };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: WITH_USERS,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { items, total };
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

  update(
    taskId: string,
    data: UpdateTaskData,
    changedById: string,
  ): Promise<TaskWithUsers> {
    return this.prisma.$transaction(async (tx) => {
      if (data.status) {
        const [current] = await tx.$queryRaw<{ status: TaskStatus }[]>`
          SELECT status FROM tasks WHERE id = ${taskId}::uuid FOR UPDATE`;

        if (current && current.status !== data.status) {
          await tx.taskStatusChange.create({
            data: {
              taskId,
              changedById,
              fromStatus: current.status,
              toStatus: data.status,
            },
          });
        }
      }

      return tx.task.update({
        where: { id: taskId },
        data,
        include: WITH_USERS,
      });
    });
  }

  async delete(taskId: string): Promise<void> {
    await this.prisma.task.delete({ where: { id: taskId } });
  }
}
