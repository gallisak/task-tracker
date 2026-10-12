import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as projectsApi from './projects-api'
import type { CreateProjectInput } from './types'

export const projectKeys = {
  byWorkspace: (workspaceId: string) =>
    ['workspaces', workspaceId, 'projects'] as const,
}

export function useProjects(workspaceId: string) {
  return useQuery({
    queryKey: projectKeys.byWorkspace(workspaceId),
    queryFn: () => projectsApi.fetchProjects(workspaceId),
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
