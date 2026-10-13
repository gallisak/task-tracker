export const MEMBER_REMOVED_EVENT = 'workspace.member.removed';

export interface MemberRemovedEvent {
  workspaceId: string;
  userId: string;
}
