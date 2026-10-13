import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type { TaskStatusChange } from '../../../generated/prisma/client.js';
import {
  USER_SUMMARY,
  type UserSummary,
} from '../../users/repositories/user-summary.js';

export type StatusChangeWithUser = TaskStatusChange & {
  changedBy: UserSummary;
};

@Injectable()
export class TaskStatusChangesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTask(taskId: string): Promise<StatusChangeWithUser[]> {
    return this.prisma.taskStatusChange.findMany({
      where: { taskId },
      include: { changedBy: USER_SUMMARY },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}
