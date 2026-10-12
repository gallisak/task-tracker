export type WorkspaceRole = 'OWNER' | 'MEMBER'

export interface Workspace {
  id: string
  name: string
  role: WorkspaceRole
  createdAt: string
  updatedAt: string
}

export interface CreateWorkspaceInput {
  name: string
}

export interface UserSummary {
  id: string
  name: string
  email: string
}

export interface Member {
  user: UserSummary
  role: WorkspaceRole
  joinedAt: string
}

export interface Invitation {
  id: string
  email: string
  role: WorkspaceRole
  invitedBy: UserSummary
  createdAt: string
}

export type InviteResult =
  | { status: 'ADDED'; member: Member }
  | { status: 'INVITED'; invitation: Invitation }
