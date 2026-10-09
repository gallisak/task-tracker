import type { InviteResult } from '../services/workspace-members.service.js';
import { InvitationResponseDto } from './invitation-response.dto.js';
import { MemberResponseDto } from './member-response.dto.js';

export class InviteResultDto {
  status: 'ADDED' | 'INVITED';
  member?: MemberResponseDto;
  invitation?: InvitationResponseDto;

  static from(result: InviteResult): InviteResultDto {
    const dto = new InviteResultDto();
    dto.status = result.status;
    if (result.status === 'ADDED') {
      dto.member = MemberResponseDto.from(result.member);
    } else {
      dto.invitation = InvitationResponseDto.from(result.invitation);
    }
    return dto;
  }
}
