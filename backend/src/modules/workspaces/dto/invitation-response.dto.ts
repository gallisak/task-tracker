import { WorkspaceRole } from '../../../generated/prisma/client.js';
import { UserSummaryDto } from '../../users/dto/user-summary.dto.js';
import type { InvitationWithInviter } from '../repositories/workspace-invitations.repository.js';

export class InvitationResponseDto {
  id: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: UserSummaryDto;
  createdAt: Date;

  static from(invitation: InvitationWithInviter): InvitationResponseDto {
    const dto = new InvitationResponseDto();
    dto.id = invitation.id;
    dto.email = invitation.email;
    dto.role = invitation.role;
    dto.invitedBy = UserSummaryDto.from(invitation.invitedBy);
    dto.createdAt = invitation.createdAt;
    return dto;
  }
}
