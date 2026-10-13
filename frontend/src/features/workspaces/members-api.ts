import { apiClient } from '@/lib/api-client'
import type {
  AcceptedInvitation,
  Invitation,
  Member,
  WorkspaceRole,
} from './types'

export async function fetchMembers(workspaceId: string): Promise<Member[]> {
  const { data } = await apiClient.get<Member[]>(
    `/workspaces/${workspaceId}/members`,
  )
  return data
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<Member> {
  const { data } = await apiClient.patch<Member>(
    `/workspaces/${workspaceId}/members/${userId}`,
    { role },
  )
  return data
}

export async function removeMember(
  workspaceId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`)
}

export async function fetchInvitations(
  workspaceId: string,
): Promise<Invitation[]> {
  const { data } = await apiClient.get<Invitation[]>(
    `/workspaces/${workspaceId}/invitations`,
  )
  return data
}

export async function inviteMember(
  workspaceId: string,
  email: string,
): Promise<Invitation> {
  const { data } = await apiClient.post<Invitation>(
    `/workspaces/${workspaceId}/invitations`,
    { email },
  )
  return data
}

export async function acceptInvitation(
  token: string,
): Promise<AcceptedInvitation> {
  const { data } = await apiClient.post<AcceptedInvitation>(
    '/invitations/accept',
    { token },
  )
  return data
}
