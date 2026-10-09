import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { isUniqueViolation } from '../../../common/utils/prisma-errors.js';
import {
  type Project,
  WorkspaceRole,
} from '../../../generated/prisma/client.js';
import { WorkspaceAccessService } from '../../workspaces/services/workspace-access.service.js';
import { CreateProjectDto } from '../dto/create-project.dto.js';
import { ProjectsRepository } from '../repositories/projects.repository.js';
import { ProjectAccessService } from './project-access.service.js';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly projects: ProjectsRepository,
    private readonly projectAccess: ProjectAccessService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async create(
    workspaceId: string,
    userId: string,
    dto: CreateProjectDto,
  ): Promise<Project> {
    await this.workspaceAccess.requireMember(workspaceId, userId);

    try {
      const project = await this.projects.create({
        workspaceId,
        name: dto.name,
        description: dto.description || null,
      });
      this.logger.log(
        `Project created: ${project.id} in workspace ${workspaceId} by user ${userId}`,
      );
      return project;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A project with this name already exists in the workspace',
        );
      }
      throw error;
    }
  }

  async findAll(workspaceId: string, userId: string): Promise<Project[]> {
    await this.workspaceAccess.requireMember(workspaceId, userId);
    return this.projects.findAllByWorkspace(workspaceId);
  }

  async getForUser(projectId: string, userId: string): Promise<Project> {
    const { project } = await this.projectAccess.requireProject(
      projectId,
      userId,
    );
    return project;
  }

  async remove(projectId: string, userId: string): Promise<void> {
    const { project, role } = await this.projectAccess.requireProject(
      projectId,
      userId,
    );
    if (role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only workspace owners can delete projects');
    }

    await this.projects.delete(project.id);
    this.logger.log(`Project deleted: ${project.id} by user ${userId}`);
  }
}
