import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto.js';
import {
  type WorkspaceMembership,
  WorkspacesRepository,
} from '../repositories/workspaces.repository.js';

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(private readonly workspaces: WorkspacesRepository) {}

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

  async getForUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMembership> {
    const membership = await this.workspaces.findForUser(workspaceId, userId);
    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }
    return membership;
  }
}
