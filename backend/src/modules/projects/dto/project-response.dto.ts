import type { Project } from '../../../generated/prisma/client.js';

export class ProjectResponseDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;

  static from(project: Project): ProjectResponseDto {
    const dto = new ProjectResponseDto();
    dto.id = project.id;
    dto.workspaceId = project.workspaceId;
    dto.name = project.name;
    dto.description = project.description;
    dto.createdAt = project.createdAt;
    dto.updatedAt = project.updatedAt;
    return dto;
  }
}
