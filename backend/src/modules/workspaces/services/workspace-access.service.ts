import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '../../../generated/prisma/client.js';
import {
  type WorkspaceMembership,
  WorkspacesRepository,
} from '../repositories/workspaces.repository.js';

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly workspaces: WorkspacesRepository) {}

  async requireMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMembership> {
    const membership = await this.workspaces.findForUser(workspaceId, userId);
    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }
    return membership;
  }

  async requireOwner(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMembership> {
    const membership = await this.requireMember(workspaceId, userId);
    if (membership.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException(
        'Only workspace owners can perform this action',
      );
    }
    return membership;
  }
}
