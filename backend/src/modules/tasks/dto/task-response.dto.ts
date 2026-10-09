import { TaskPriority, TaskStatus } from '../../../generated/prisma/client.js';
import { UserSummaryDto } from '../../users/dto/user-summary.dto.js';
import type { TaskWithUsers } from '../repositories/tasks.repository.js';

export class TaskResponseDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assignee: UserSummaryDto | null;
  creator: UserSummaryDto;
  createdAt: Date;
  updatedAt: Date;

  static from(task: TaskWithUsers): TaskResponseDto {
    const dto = new TaskResponseDto();
    dto.id = task.id;
    dto.projectId = task.projectId;
    dto.title = task.title;
    dto.description = task.description;
    dto.status = task.status;
    dto.priority = task.priority;
    dto.dueDate = task.dueDate;
    dto.assignee = task.assignee ? UserSummaryDto.from(task.assignee) : null;
    dto.creator = UserSummaryDto.from(task.creator);
    dto.createdAt = task.createdAt;
    dto.updatedAt = task.updatedAt;
    return dto;
  }
}
