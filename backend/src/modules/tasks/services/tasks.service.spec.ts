import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
} from '../../../generated/prisma/client.js';
import type { ProjectAccessService } from '../../projects/services/project-access.service.js';
import type { WorkspaceAccessService } from '../../workspaces/services/workspace-access.service.js';
import type { TaskStatusChangesRepository } from '../repositories/task-status-changes.repository.js';
import type {
  TaskWithUsers,
  TasksRepository,
} from '../repositories/tasks.repository.js';
import { TasksService } from './tasks.service.js';

const WORKSPACE_ID = 'workspace-1';
const PROJECT_ID = 'project-1';
const USER_ID = 'user-1';
const TEAMMATE_ID = 'user-2';

const user = (id: string) => ({
  id,
  email: `${id}@example.com`,
  name: id,
  passwordHash: 'hash',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

const buildTask = (overrides: Partial<TaskWithUsers> = {}): TaskWithUsers => ({
  id: 'task-1',
  projectId: PROJECT_ID,
  title: 'Write copy',
  description: null,
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  assigneeId: null,
  creatorId: USER_ID,
  dueDate: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  assignee: null,
  creator: user(USER_ID),
  ...overrides,
});

describe('TasksService', () => {
  const tasks = {
    create: vi.fn(),
    findForUser: vi.fn(),
    findPage: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const statusChanges = { findAllByTask: vi.fn() };
  const projectAccess = { requireProject: vi.fn() };
  const workspaceAccess = { isMember: vi.fn() };
  let service: TasksService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new TasksService(
      tasks as unknown as TasksRepository,
      statusChanges as unknown as TaskStatusChangesRepository,
      projectAccess as unknown as ProjectAccessService,
      workspaceAccess as unknown as WorkspaceAccessService,
    );
    vi.spyOn(service['logger'], 'log').mockImplementation(() => undefined);

    projectAccess.requireProject.mockResolvedValue({
      project: { id: PROJECT_ID, workspaceId: WORKSPACE_ID },
      role: WorkspaceRole.MEMBER,
    });
    tasks.create.mockImplementation(async () => buildTask());
    tasks.update.mockImplementation(async () => buildTask());
  });

  describe('create', () => {
    it('creates an unassigned task on behalf of the current user', async () => {
      await service.create(PROJECT_ID, USER_ID, { title: 'Write copy' });

      expect(tasks.create).toHaveBeenCalledWith({
        projectId: PROJECT_ID,
        creatorId: USER_ID,
        title: 'Write copy',
        description: null,
        status: undefined,
        priority: undefined,
        assigneeId: null,
        dueDate: null,
      });
      expect(workspaceAccess.isMember).not.toHaveBeenCalled();
    });

    it('converts the due date and keeps the chosen status and priority', async () => {
      await service.create(PROJECT_ID, USER_ID, {
        title: 'Write copy',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: '2026-12-01T10:00:00.000Z',
      });

      expect(tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDate: new Date('2026-12-01T10:00:00.000Z'),
        }),
      );
    });

    it('accepts an assignee who belongs to the workspace', async () => {
      workspaceAccess.isMember.mockResolvedValue(true);

      await service.create(PROJECT_ID, USER_ID, {
        title: 'Write copy',
        assigneeId: TEAMMATE_ID,
      });

      expect(workspaceAccess.isMember).toHaveBeenCalledWith(
        WORKSPACE_ID,
        TEAMMATE_ID,
      );
      expect(tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: TEAMMATE_ID }),
      );
    });

    it('rejects an assignee from outside the workspace', async () => {
      workspaceAccess.isMember.mockResolvedValue(false);

      await expect(
        service.create(PROJECT_ID, USER_ID, {
          title: 'Write copy',
          assigneeId: 'stranger',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(tasks.create).not.toHaveBeenCalled();
    });

    it('does not create anything when the project is not accessible', async () => {
      projectAccess.requireProject.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      await expect(
        service.create(PROJECT_ID, USER_ID, { title: 'Write copy' }),
      ).rejects.toThrow(NotFoundException);
      expect(tasks.create).not.toHaveBeenCalled();
    });
  });

  describe('findPage', () => {
    beforeEach(() => {
      tasks.findPage.mockResolvedValue({ items: [buildTask()], total: 41 });
    });

    it('translates the page number into an offset', async () => {
      const result = await service.findPage(PROJECT_ID, USER_ID, {
        page: 3,
        limit: 20,
      });

      expect(tasks.findPage).toHaveBeenCalledWith(
        PROJECT_ID,
        {},
        { skip: 40, take: 20 },
      );
      expect(result).toMatchObject({ total: 41, page: 3, limit: 20 });
    });

    it('passes only the filters to the repository', async () => {
      await service.findPage(PROJECT_ID, USER_ID, {
        page: 1,
        limit: 10,
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        assigneeId: TEAMMATE_ID,
      });

      expect(tasks.findPage).toHaveBeenCalledWith(
        PROJECT_ID,
        {
          status: TaskStatus.DONE,
          priority: TaskPriority.HIGH,
          assigneeId: TEAMMATE_ID,
        },
        { skip: 0, take: 10 },
      );
    });

    it('does not query tasks of an inaccessible project', async () => {
      projectAccess.requireProject.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      await expect(
        service.findPage(PROJECT_ID, USER_ID, { page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundException);
      expect(tasks.findPage).not.toHaveBeenCalled();
    });
  });

  describe('getForUser', () => {
    it('throws when the task is missing or belongs to a foreign workspace', async () => {
      tasks.findForUser.mockResolvedValue(null);

      await expect(service.getForUser('task-1', USER_ID)).rejects.toThrow(
        'Task not found',
      );
    });
  });

  describe('update', () => {
    const existing = (overrides: Partial<TaskWithUsers> = {}) =>
      tasks.findForUser.mockResolvedValue({
        task: buildTask(overrides),
        workspaceId: WORKSPACE_ID,
      });

    it('saves only the fields that actually changed', async () => {
      existing({ title: 'Write copy', priority: TaskPriority.MEDIUM });

      await service.update('task-1', USER_ID, {
        title: 'Write copy',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.DONE,
      });

      expect(tasks.update).toHaveBeenCalledWith(
        'task-1',
        {
          status: TaskStatus.DONE,
        },
        USER_ID,
      );
    });

    it('skips the database when nothing changed', async () => {
      existing({ status: TaskStatus.TODO });

      const result = await service.update('task-1', USER_ID, {
        status: TaskStatus.TODO,
      });

      expect(tasks.update).not.toHaveBeenCalled();
      expect(result.id).toBe('task-1');
    });

    it('checks a new assignee against the workspace of the task', async () => {
      existing();
      workspaceAccess.isMember.mockResolvedValue(true);

      await service.update('task-1', USER_ID, { assigneeId: TEAMMATE_ID });

      expect(workspaceAccess.isMember).toHaveBeenCalledWith(
        WORKSPACE_ID,
        TEAMMATE_ID,
      );
      expect(tasks.update).toHaveBeenCalledWith(
        'task-1',
        {
          assigneeId: TEAMMATE_ID,
        },
        USER_ID,
      );
    });

    it('rejects a new assignee from outside the workspace', async () => {
      existing();
      workspaceAccess.isMember.mockResolvedValue(false);

      await expect(
        service.update('task-1', USER_ID, { assigneeId: 'stranger' }),
      ).rejects.toThrow('Assignee must be a member of the workspace');
      expect(tasks.update).not.toHaveBeenCalled();
    });

    it('unassigns the task without a membership check', async () => {
      existing({ assigneeId: TEAMMATE_ID, assignee: user(TEAMMATE_ID) });

      await service.update('task-1', USER_ID, { assigneeId: null });

      expect(workspaceAccess.isMember).not.toHaveBeenCalled();
      expect(tasks.update).toHaveBeenCalledWith(
        'task-1',
        { assigneeId: null },
        USER_ID,
      );
    });

    it('clears the description and the due date', async () => {
      existing({
        description: 'Old text',
        dueDate: new Date('2026-12-01T10:00:00.000Z'),
      });

      await service.update('task-1', USER_ID, {
        description: '',
        dueDate: null,
      });

      expect(tasks.update).toHaveBeenCalledWith(
        'task-1',
        {
          description: null,
          dueDate: null,
        },
        USER_ID,
      );
    });

    it('treats the same instant in another format as unchanged', async () => {
      existing({ dueDate: new Date('2026-12-01T10:00:00.000Z') });

      await service.update('task-1', USER_ID, {
        dueDate: '2026-12-01T12:00:00+02:00',
      });

      expect(tasks.update).not.toHaveBeenCalled();
    });

    it('throws when the task is not accessible', async () => {
      tasks.findForUser.mockResolvedValue(null);

      await expect(
        service.update('task-1', USER_ID, { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findStatusHistory', () => {
    it('returns the history of an accessible task', async () => {
      tasks.findForUser.mockResolvedValue({
        task: buildTask(),
        workspaceId: WORKSPACE_ID,
      });
      statusChanges.findAllByTask.mockResolvedValue([]);

      await service.findStatusHistory('task-1', USER_ID);

      expect(statusChanges.findAllByTask).toHaveBeenCalledWith('task-1');
    });

    it('does not expose the history of an inaccessible task', async () => {
      tasks.findForUser.mockResolvedValue(null);

      await expect(
        service.findStatusHistory('task-1', USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(statusChanges.findAllByTask).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an accessible task', async () => {
      tasks.findForUser.mockResolvedValue({
        task: buildTask(),
        workspaceId: WORKSPACE_ID,
      });

      await service.remove('task-1', USER_ID);

      expect(tasks.delete).toHaveBeenCalledWith('task-1');
    });

    it('does not delete a task the user cannot access', async () => {
      tasks.findForUser.mockResolvedValue(null);

      await expect(service.remove('task-1', USER_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(tasks.delete).not.toHaveBeenCalled();
    });
  });
});
