import { apiClient } from '@/lib/api-client'
import type { CreateProjectInput, Project } from './types'

export async function fetchProjects(workspaceId: string): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>(
    `/workspaces/${workspaceId}/projects`,
  )
  return data
}

export async function fetchProject(projectId: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/projects/${projectId}`)
  return data
}

export async function createProject(
  workspaceId: string,
  input: CreateProjectInput,
): Promise<Project> {
  const { data } = await apiClient.post<Project>(
    `/workspaces/${workspaceId}/projects`,
    input,
  )
  return data
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}`)
}
