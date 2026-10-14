import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/features/auth/session-store'
import * as membersApi from './members-api'
import type { WorkspaceRole } from './types'
import { workspaceKeys } from './use-workspaces'

export const memberKeys = {
  members: (workspaceId: string) =>
    [...workspaceKeys.detail(workspaceId), 'members'] as const,
  invitations: (workspaceId: string) =>
    [...workspaceKeys.detail(workspaceId), 'invitations'] as const,
}

export function useMembers(workspaceId: string) {
  return useQuery({
    queryKey: memberKeys.members(workspaceId),
    queryFn: () => membersApi.fetchMembers(workspaceId),
  })
}

export function useInvitations(workspaceId: string) {
  return useQuery({
    queryKey: memberKeys.invitations(workspaceId),
    queryFn: () => membersApi.fetchInvitations(workspaceId),
  })
}

export function useInviteMember(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) => membersApi.inviteMember(workspaceId, email),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: memberKeys.invitations(workspaceId),
      }),
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: membersApi.acceptInvitation,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
  })
}

export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceRole }) =>
      membersApi.updateMemberRole(workspaceId, userId, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
  })
}

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient()
  const { user } = useSession()

  return useMutation({
    mutationFn: (userId: string) =>
      membersApi.removeMember(workspaceId, userId),
    onSuccess: (_data, userId) =>
      userId === user?.id
        ? queryClient.invalidateQueries({
            queryKey: workspaceKeys.all,
            exact: true,
          })
        : queryClient.invalidateQueries({
            queryKey: memberKeys.members(workspaceId),
          }),
  })
}
