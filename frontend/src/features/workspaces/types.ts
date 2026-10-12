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
