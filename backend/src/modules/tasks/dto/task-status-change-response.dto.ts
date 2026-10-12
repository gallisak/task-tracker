import { TaskStatus } from '../../../generated/prisma/client.js';
import { UserSummaryDto } from '../../users/dto/user-summary.dto.js';
import type { StatusChangeWithUser } from '../repositories/task-status-changes.repository.js';

export class TaskStatusChangeResponseDto {
  id: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: UserSummaryDto;
  changedAt: Date;

  static from(change: StatusChangeWithUser): TaskStatusChangeResponseDto {
    const dto = new TaskStatusChangeResponseDto();
    dto.id = change.id;
    dto.fromStatus = change.fromStatus;
    dto.toStatus = change.toStatus;
    dto.changedBy = UserSummaryDto.from(change.changedBy);
    dto.changedAt = change.createdAt;
    return dto;
  }
}
