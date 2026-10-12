export interface Project {
  id: string
  workspaceId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProjectInput {
  name: string
  description?: string
}
