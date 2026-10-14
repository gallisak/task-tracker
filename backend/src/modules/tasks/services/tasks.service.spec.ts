import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  TaskPriority,
  TaskStatus,
  WorkspaceRole,
} from '../../../generated/prisma/client.js';
import type { ProjectAccessService } from '../../projects/services/project-access.service.js';
import type { TasksGateway } from '../gateways/tasks.gateway.js';
import type { TaskStatusChangesRepository } from '../repositories/task-status-changes.repository.js';
import {
  AssigneeNotMemberError,
  type TaskWithUsers,
  type TasksRepository,
} from '../repositories/tasks.repository.js';
import { encodeTaskCursor } from '../utils/task-cursor.js';
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
  const gateway = {
    taskCreated: vi.fn(),
    taskUpdated: vi.fn(),
    taskDeleted: vi.fn(),
  };
  let service: TasksService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new TasksService(
      tasks as unknown as TasksRepository,
      statusChanges as unknown as TaskStatusChangesRepository,
      projectAccess as unknown as ProjectAccessService,
      gateway as unknown as TasksGateway,
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

      expect(tasks.create).toHaveBeenCalledWith(
        {
          projectId: PROJECT_ID,
          creatorId: USER_ID,
          title: 'Write copy',
          description: null,
          status: undefined,
          priority: undefined,
          assigneeId: null,
          dueDate: null,
        },
        WORKSPACE_ID,
      );
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
        WORKSPACE_ID,
      );
    });

    it('saves an assignee together with the workspace to check them against', async () => {
      await service.create(PROJECT_ID, USER_ID, {
        title: 'Write copy',
        assigneeId: TEAMMATE_ID,
      });

      expect(tasks.create).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: TEAMMATE_ID }),
        WORKSPACE_ID,
      );
    });

    it('rejects an assignee from outside the workspace', async () => {
      tasks.create.mockRejectedValue(new AssigneeNotMemberError());

      await expect(
        service.create(PROJECT_ID, USER_ID, {
          title: 'Write copy',
          assigneeId: 'stranger',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(gateway.taskCreated).not.toHaveBeenCalled();
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

    it('asks for one extra task to learn whether more exist', async () => {
      const result = await service.findPage(PROJECT_ID, USER_ID, {
        limit: 20,
      });

      expect(tasks.findPage).toHaveBeenCalledWith(
        PROJECT_ID,
        {},
        { after: undefined, take: 21 },
      );
      expect(result).toMatchObject({ total: 41, limit: 20, nextCursor: null });
    });

    it('returns a cursor to the last task when more exist', async () => {
      const first = buildTask({ id: '01a13461-9b44-7009-a8f6-17e10aa64d6d' });
      const second = buildTask({
        id: '01a13461-9aee-715b-bfb7-164ccd2a48fa',
        createdAt: new Date('2025-12-31'),
      });
      const extra = buildTask({ id: '01a13461-9aa0-7339-b1ec-3e7693e38840' });
      tasks.findPage.mockResolvedValue({
        items: [first, second, extra],
        total: 41,
      });

      const result = await service.findPage(PROJECT_ID, USER_ID, { limit: 2 });

      expect(result.items).toEqual([first, second]);
      expect(result.nextCursor).toBe(encodeTaskCursor(second));
    });

    it('continues after the position stored in the cursor', async () => {
      const position = {
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        id: '01a13461-9b44-7009-a8f6-17e10aa64d6d',
      };

      await service.findPage(PROJECT_ID, USER_ID, {
        limit: 20,
        cursor: encodeTaskCursor(position),
      });

      expect(tasks.findPage).toHaveBeenCalledWith(
        PROJECT_ID,
        {},
        { after: position, take: 21 },
      );
    });

    it('rejects a cursor it did not issue', async () => {
      await expect(
        service.findPage(PROJECT_ID, USER_ID, { limit: 20, cursor: 'page-2' }),
      ).rejects.toThrow('Invalid cursor');
      expect(tasks.findPage).not.toHaveBeenCalled();
    });

    it('passes only the filters to the repository', async () => {
      await service.findPage(PROJECT_ID, USER_ID, {
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
        { after: undefined, take: 11 },
      );
    });

    it('does not query tasks of an inaccessible project', async () => {
      projectAccess.requireProject.mockRejectedValue(
        new NotFoundException('Project not found'),
      );

      await expect(
        service.findPage(PROJECT_ID, USER_ID, { limit: 20 }),
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
        WORKSPACE_ID,
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

    it('saves a new assignee together with the workspace of the task', async () => {
      existing();

      await service.update('task-1', USER_ID, { assigneeId: TEAMMATE_ID });

      expect(tasks.update).toHaveBeenCalledWith(
        'task-1',
        {
          assigneeId: TEAMMATE_ID,
        },
        USER_ID,
        WORKSPACE_ID,
      );
    });

    it('rejects a new assignee from outside the workspace', async () => {
      existing();
      tasks.update.mockRejectedValue(new AssigneeNotMemberError());

      await expect(
        service.update('task-1', USER_ID, { assigneeId: 'stranger' }),
      ).rejects.toThrow('Assignee must be a member of the workspace');
    });

    it('unassigns the task', async () => {
      existing({ assigneeId: TEAMMATE_ID, assignee: user(TEAMMATE_ID) });

      await service.update('task-1', USER_ID, { assigneeId: null });

      expect(tasks.update).toHaveBeenCalledWith(
        'task-1',
        { assigneeId: null },
        USER_ID,
        WORKSPACE_ID,
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
        WORKSPACE_ID,
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

  describe('realtime notifications', () => {
    const existing = () =>
      tasks.findForUser.mockResolvedValue({
        task: buildTask(),
        workspaceId: WORKSPACE_ID,
      });

    it('announces a created task', async () => {
      const created = await service.create(PROJECT_ID, USER_ID, {
        title: 'Write copy',
      });

      expect(gateway.taskCreated).toHaveBeenCalledWith(created);
    });

    it('announces the saved state of an updated task', async () => {
      existing();
      const saved = buildTask({ status: TaskStatus.DONE });
      tasks.update.mockResolvedValue(saved);

      await service.update('task-1', USER_ID, { status: TaskStatus.DONE });

      expect(gateway.taskUpdated).toHaveBeenCalledWith(saved);
    });

    it('stays silent when an update changes nothing', async () => {
      existing();

      await service.update('task-1', USER_ID, { status: TaskStatus.TODO });

      expect(gateway.taskUpdated).not.toHaveBeenCalled();
    });

    it('stays silent when an update is rejected', async () => {
      existing();
      tasks.update.mockRejectedValue(new AssigneeNotMemberError());

      await expect(
        service.update('task-1', USER_ID, { assigneeId: 'stranger' }),
      ).rejects.toThrow();
      expect(gateway.taskUpdated).not.toHaveBeenCalled();
    });

    it('announces a deleted task with its project', async () => {
      existing();

      await service.remove('task-1', USER_ID);

      expect(gateway.taskDeleted).toHaveBeenCalledWith(PROJECT_ID, 'task-1');
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
