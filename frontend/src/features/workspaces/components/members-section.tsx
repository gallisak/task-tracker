import { toast } from 'sonner'
import { ErrorState, LoadingState } from '@/components/page-states'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserAvatar } from '@/components/user-avatar'
import { useSession } from '@/features/auth/session-store'
import { getErrorMessage } from '@/lib/api-client'
import type { Invitation, Member, WorkspaceRole } from '../types'
import {
  useInvitations,
  useMembers,
  useUpdateMemberRole,
} from '../use-members'
import { InviteMemberForm } from './invite-member-form'
import { RemoveMemberDialog } from './remove-member-dialog'
import { RoleBadge } from './role-badge'

interface MemberRowProps {
  workspaceId: string
  member: Member
  canManage: boolean
  isSelf: boolean
}

function MemberRow({ workspaceId, member, canManage, isSelf }: MemberRowProps) {
  const updateRole = useUpdateMemberRole(workspaceId)

  const onRoleChange = (role: WorkspaceRole) => {
    updateRole.mutate(
      { userId: member.user.id, role },
      {
        onSuccess: () =>
          toast.success(
            `${member.user.name} is now ${role === 'OWNER' ? 'an owner' : 'a member'}`,
          ),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <UserAvatar name={member.user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.user.name}
          {isSelf && <span className="text-muted-foreground"> (you)</span>}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {member.user.email}
        </p>
      </div>
      {canManage ? (
        <>
          <Select
            value={member.role}
            disabled={updateRole.isPending}
            onValueChange={(role) => onRoleChange(role as WorkspaceRole)}
          >
            <SelectTrigger
              size="sm"
              aria-label={`Role of ${member.user.name}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OWNER">Owner</SelectItem>
              <SelectItem value="MEMBER">Member</SelectItem>
            </SelectContent>
          </Select>
          <RemoveMemberDialog
            workspaceId={workspaceId}
            member={member}
            isSelf={isSelf}
          />
        </>
      ) : (
        <RoleBadge role={member.role} />
      )}
    </li>
  )
}

const expiryFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })

function invitationStatus(invitation: Invitation): string {
  const expiresAt = new Date(invitation.expiresAt)
  return expiresAt.getTime() <= Date.now()
    ? 'Expired, invite again to renew'
    : `Invited by ${invitation.invitedBy.name}, expires ${expiryFormat.format(expiresAt)}`
}

function PendingInvitations({ workspaceId }: { workspaceId: string }) {
  const invitations = useInvitations(workspaceId)

  if (!invitations.data?.length) {
    return null
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        Pending invitations
      </h3>
      <ul className="divide-y rounded-xl border">
        {invitations.data.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <span className="truncate">{invitation.email}</span>
            <span className="shrink-0 text-muted-foreground">
              {invitationStatus(invitation)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface MembersSectionProps {
  workspaceId: string
  canManage: boolean
}

export function MembersSection({ workspaceId, canManage }: MembersSectionProps) {
  const { user } = useSession()
  const members = useMembers(workspaceId)

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">Members</h2>
      {canManage && <InviteMemberForm workspaceId={workspaceId} />}
      {members.isPending ? (
        <LoadingState label="Loading members…" />
      ) : members.isError ? (
        <ErrorState
          title="Could not load members"
          message={getErrorMessage(members.error)}
          onAction={() => void members.refetch()}
        />
      ) : (
        <ul className="divide-y rounded-xl border">
          {members.data.map((member) => (
            <MemberRow
              key={member.user.id}
              workspaceId={workspaceId}
              member={member}
              canManage={canManage}
              isSelf={member.user.id === user?.id}
            />
          ))}
        </ul>
      )}
      {canManage && <PendingInvitations workspaceId={workspaceId} />}
    </section>
  )
}
