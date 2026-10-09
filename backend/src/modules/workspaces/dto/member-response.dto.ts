import { WorkspaceRole } from '../../../generated/prisma/client.js';
import { UserSummaryDto } from '../../users/dto/user-summary.dto.js';
import type { MemberWithUser } from '../repositories/workspace-members.repository.js';

export class MemberResponseDto {
  user: UserSummaryDto;
  role: WorkspaceRole;
  joinedAt: Date;

  static from(member: MemberWithUser): MemberResponseDto {
    const dto = new MemberResponseDto();
    dto.user = UserSummaryDto.from(member.user);
    dto.role = member.role;
    dto.joinedAt = member.joinedAt;
    return dto;
  }
}
