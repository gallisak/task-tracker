import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  Project,
  WorkspaceRole,
} from '../../../generated/prisma/client.js';

export interface CreateProjectData {
  workspaceId: string;
  name: string;
  description: string | null;
}

export interface ProjectAccess {
  project: Project;
  role: WorkspaceRole;
}

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateProjectData): Promise<Project> {
    return this.prisma.project.create({ data });
  }

  findAllByWorkspace(workspaceId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectAccess | null> {
    const found = await this.prisma.project.findFirst({
      where: { id: projectId, workspace: { members: { some: { userId } } } },
      include: {
        workspace: {
          select: { members: { where: { userId }, select: { role: true } } },
        },
      },
    });
    if (!found) {
      return null;
    }

    const { workspace, ...project } = found;
    return { project, role: workspace.members[0].role };
  }

  async delete(projectId: string): Promise<void> {
    await this.prisma.project.delete({ where: { id: projectId } });
  }
}
