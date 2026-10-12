import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  TaskStatusChange,
  User,
} from '../../../generated/prisma/client.js';

export type StatusChangeWithUser = TaskStatusChange & { changedBy: User };

@Injectable()
export class TaskStatusChangesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByTask(taskId: string): Promise<StatusChangeWithUser[]> {
    return this.prisma.taskStatusChange.findMany({
      where: { taskId },
      include: { changedBy: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}
