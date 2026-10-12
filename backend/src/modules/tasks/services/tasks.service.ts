import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProjectAccessService } from '../../projects/services/project-access.service.js';
import { WorkspaceAccessService } from '../../workspaces/services/workspace-access.service.js';
import { CreateTaskDto } from '../dto/create-task.dto.js';
import { ListTasksQueryDto } from '../dto/list-tasks-query.dto.js';
import { UpdateTaskDto } from '../dto/update-task.dto.js';
import {
  type TaskAccess,
  type TaskWithUsers,
  TasksRepository,
  type UpdateTaskData,
} from '../repositories/tasks.repository.js';

export interface TaskPage {
  items: TaskWithUsers[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly tasks: TasksRepository,
    private readonly projectAccess: ProjectAccessService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<TaskWithUsers> {
    const { project } = await this.projectAccess.requireProject(
      projectId,
      userId,
    );
    if (dto.assigneeId) {
      await this.assertAssignable(project.workspaceId, dto.assigneeId);
    }

    const task = await this.tasks.create({
      projectId: project.id,
      creatorId: userId,
      title: dto.title,
      description: dto.description || null,
      status: dto.status,
      priority: dto.priority,
      assigneeId: dto.assigneeId ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });

    this.logger.log(
      `Task created: ${task.id} in project ${project.id} by user ${userId}`,
    );
    return task;
  }

  async findPage(
    projectId: string,
    userId: string,
    query: ListTasksQueryDto,
  ): Promise<TaskPage> {
    const { project } = await this.projectAccess.requireProject(
      projectId,
      userId,
    );

    const { page, limit, ...filters } = query;
    const { items, total } = await this.tasks.findPage(project.id, filters, {
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getForUser(taskId: string, userId: string): Promise<TaskWithUsers> {
    const { task } = await this.requireTask(taskId, userId);
    return task;
  }

  async update(
    taskId: string,
    userId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskWithUsers> {
    const { task, workspaceId } = await this.requireTask(taskId, userId);

    const changes = this.collectChanges(task, dto);
    if (Object.keys(changes).length === 0) {
      return task;
    }
    if (changes.assigneeId) {
      await this.assertAssignable(workspaceId, changes.assigneeId);
    }

    const updated = await this.tasks.update(task.id, changes);
    this.logger.log(
      `Task updated: ${task.id} by user ${userId} (${Object.keys(changes).join(', ')})`,
    );
    return updated;
  }

  async remove(taskId: string, userId: string): Promise<void> {
    const { task } = await this.requireTask(taskId, userId);

    await this.tasks.delete(task.id);
    this.logger.log(`Task deleted: ${task.id} by user ${userId}`);
  }

  private async requireTask(
    taskId: string,
    userId: string,
  ): Promise<TaskAccess> {
    const access = await this.tasks.findForUser(taskId, userId);
    if (!access) {
      throw new NotFoundException('Task not found');
    }
    return access;
  }

  private async assertAssignable(
    workspaceId: string,
    assigneeId: string,
  ): Promise<void> {
    if (!(await this.workspaceAccess.isMember(workspaceId, assigneeId))) {
      throw new BadRequestException(
        'Assignee must be a member of the workspace',
      );
    }
  }

  private collectChanges(
    task: TaskWithUsers,
    dto: UpdateTaskDto,
  ): UpdateTaskData {
    const changes: UpdateTaskData = {};

    if (dto.title !== undefined && dto.title !== task.title) {
      changes.title = dto.title;
    }
    if (dto.description !== undefined) {
      const description = dto.description || null;
      if (description !== task.description) {
        changes.description = description;
      }
    }
    if (dto.status !== undefined && dto.status !== task.status) {
      changes.status = dto.status;
    }
    if (dto.priority !== undefined && dto.priority !== task.priority) {
      changes.priority = dto.priority;
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== task.assigneeId) {
      changes.assigneeId = dto.assigneeId;
    }
    if (dto.dueDate !== undefined) {
      const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
      if (dueDate?.getTime() !== task.dueDate?.getTime()) {
        changes.dueDate = dueDate;
      }
    }

    return changes;
  }
}
