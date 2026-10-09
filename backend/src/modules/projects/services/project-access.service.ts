import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type ProjectAccess,
  ProjectsRepository,
} from '../repositories/projects.repository.js';

@Injectable()
export class ProjectAccessService {
  constructor(private readonly projects: ProjectsRepository) {}

  async requireProject(
    projectId: string,
    userId: string,
  ): Promise<ProjectAccess> {
    const access = await this.projects.findForUser(projectId, userId);
    if (!access) {
      throw new NotFoundException('Project not found');
    }
    return access;
  }
}
