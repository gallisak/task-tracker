import { Injectable, Logger } from '@nestjs/common';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto.js';
import {
  type WorkspaceMembership,
  WorkspacesRepository,
} from '../repositories/workspaces.repository.js';
import { WorkspaceAccessService } from './workspace-access.service.js';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly workspaces: WorkspacesRepository,
    private readonly access: WorkspaceAccessService,
  ) {}

  async create(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceMembership> {
    const membership = await this.workspaces.createWithOwner(dto.name, userId);

    this.logger.log(
      `Workspace created: ${membership.workspaceId} by user ${userId}`,
    );
    return membership;
  }

  findAllForUser(userId: string): Promise<WorkspaceMembership[]> {
    return this.workspaces.findAllForUser(userId);
  }

  getForUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMembership> {
    return this.access.requireMember(workspaceId, userId);
  }
}
