import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DbClient } from '../../../database/prisma.service.js';
import { WorkspaceRole } from '../../../generated/prisma/client.js';
import {
  type WorkspaceMembership,
  WorkspacesRepository,
} from '../repositories/workspaces.repository.js';

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly workspaces: WorkspacesRepository) {}

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    return (await this.workspaces.findForUser(workspaceId, userId)) !== null;
  }

  async requireMember(
    workspaceId: string,
    userId: string,
    db?: DbClient,
  ): Promise<WorkspaceMembership> {
    const membership = await this.workspaces.findForUser(
      workspaceId,
      userId,
      db,
    );
    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }
    return membership;
  }

  async requireOwner(
    workspaceId: string,
    userId: string,
    db?: DbClient,
  ): Promise<WorkspaceMembership> {
    const membership = await this.requireMember(workspaceId, userId, db);
    if (membership.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException(
        'Only workspace owners can perform this action',
      );
    }
    return membership;
  }
}
