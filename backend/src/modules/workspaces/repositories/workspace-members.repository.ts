import { Injectable } from '@nestjs/common';
import {
  type DbClient,
  PrismaService,
} from '../../../database/prisma.service.js';
import {
  Prisma,
  type User,
  type WorkspaceMember,
  WorkspaceRole,
} from '../../../generated/prisma/client.js';

export type MemberWithUser = WorkspaceMember & { user: User };

@Injectable()
export class WorkspaceMembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  withWorkspaceLock<T>(
    workspaceId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
      return work(tx);
    });
  }

  findAll(workspaceId: string): Promise<MemberWithUser[]> {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  find(
    workspaceId: string,
    userId: string,
    db: DbClient = this.prisma,
  ): Promise<WorkspaceMember | null> {
    return db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }

  countOwners(
    workspaceId: string,
    db: DbClient = this.prisma,
  ): Promise<number> {
    return db.workspaceMember.count({
      where: { workspaceId, role: WorkspaceRole.OWNER },
    });
  }

  add(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<MemberWithUser> {
    return this.prisma.workspaceMember.create({
      data: { workspaceId, userId, role },
      include: { user: true },
    });
  }

  updateRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    db: DbClient = this.prisma,
  ): Promise<MemberWithUser> {
    return db.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
      include: { user: true },
    });
  }

  async remove(
    workspaceId: string,
    userId: string,
    db: DbClient = this.prisma,
  ): Promise<void> {
    await db.task.updateMany({
      where: { assigneeId: userId, project: { workspaceId } },
      data: { assigneeId: null },
    });
    await db.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  }
}
