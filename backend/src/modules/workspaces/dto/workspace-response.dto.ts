import { WorkspaceRole } from '../../../generated/prisma/client.js';
import type { WorkspaceMembership } from '../repositories/workspaces.repository.js';

export class WorkspaceResponseDto {
  id: string;
  name: string;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;

  static from(membership: WorkspaceMembership): WorkspaceResponseDto {
    const dto = new WorkspaceResponseDto();
    dto.id = membership.workspace.id;
    dto.name = membership.workspace.name;
    dto.role = membership.role;
    dto.createdAt = membership.workspace.createdAt;
    dto.updatedAt = membership.workspace.updatedAt;
    return dto;
  }
}
