import { apiClient } from '@/lib/api-client'
import type { CreateWorkspaceInput, Workspace } from './types'

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data } = await apiClient.get<Workspace[]>('/workspaces')
  return data
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const { data } = await apiClient.post<Workspace>('/workspaces', input)
  return data
}

export async function fetchWorkspace(workspaceId: string): Promise<Workspace> {
  const { data } = await apiClient.get<Workspace>(`/workspaces/${workspaceId}`)
  return data
}
