import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isUuid } from '@/lib/uuid'
import * as projectsApi from './projects-api'
import type { CreateProjectInput } from './types'

export const projectKeys = {
  byWorkspace: (workspaceId: string) =>
    ['workspaces', workspaceId, 'projects'] as const,
  detail: (projectId: string) => ['projects', projectId] as const,
}

export function useProjects(workspaceId: string) {
  return useQuery({
    queryKey: projectKeys.byWorkspace(workspaceId),
    queryFn: () => projectsApi.fetchProjects(workspaceId),
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectsApi.fetchProject(projectId),
    enabled: isUuid(projectId),
  })
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      projectsApi.createProject(workspaceId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectKeys.byWorkspace(workspaceId),
      }),
  })
}

export function useDeleteProject(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: projectKeys.byWorkspace(workspaceId),
      }),
  })
}
