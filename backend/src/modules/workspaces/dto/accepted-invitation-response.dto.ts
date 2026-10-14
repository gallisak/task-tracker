export class AcceptedInvitationResponseDto {
  workspaceId: string;

  static from(workspaceId: string): AcceptedInvitationResponseDto {
    const dto = new AcceptedInvitationResponseDto();
    dto.workspaceId = workspaceId;
    return dto;
  }
}
