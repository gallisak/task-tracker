import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
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
  ): Promise<WorkspaceMembership | null> {
    return this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });
  }
}
