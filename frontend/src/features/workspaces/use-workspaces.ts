import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as workspacesApi from './workspaces-api'

export const workspaceKeys = {
  all: ['workspaces'] as const,
}

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.all,
    queryFn: workspacesApi.fetchWorkspaces,
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
