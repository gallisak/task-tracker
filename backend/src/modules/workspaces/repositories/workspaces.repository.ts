import { Injectable } from '@nestjs/common';
import {
  type DbClient,
  PrismaService,
} from '../../../database/prisma.service.js';
import {
  type Workspace,
  type WorkspaceMember,
  WorkspaceRole,
} from '../../../generated/prisma/client.js';

export type WorkspaceMembership = WorkspaceMember & { workspace: Workspace };

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithOwner(name: string, ownerId: string): Promise<WorkspaceMembership> {
    return this.prisma.workspaceMember.create({
      data: {
        role: WorkspaceRole.OWNER,
        user: { connect: { id: ownerId } },
        workspace: { create: { name } },
      },
      include: { workspace: true },
    });
  }

  findAllForUser(userId: string): Promise<WorkspaceMembership[]> {
    return this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { workspace: { createdAt: 'desc' } },
    });
  }

  findForUser(
    workspaceId: string,
    userId: string,
    db: DbClient = this.prisma,
  ): Promise<WorkspaceMembership | null> {
    return db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });
  }
}
