import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isUuid } from '@/lib/uuid'
import * as workspacesApi from './workspaces-api'

export const workspaceKeys = {
  all: ['workspaces'] as const,
  detail: (workspaceId: string) => ['workspaces', workspaceId] as const,
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.all,
    queryFn: workspacesApi.fetchWorkspaces,
  })
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => workspacesApi.fetchWorkspace(workspaceId),
    enabled: isUuid(workspaceId),
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: workspacesApi.createWorkspace,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
  })
}
