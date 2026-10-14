import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormError } from '@/components/form-error'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { inviteSchema, type InviteFormValues } from '../schemas'
import { useInviteMember } from '../use-members'

export function InviteMemberForm({ workspaceId }: { workspaceId: string }) {
  const inviteMember = useInviteMember(workspaceId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = ({ email }: InviteFormValues) => {
    inviteMember.mutate(email, {
      onSuccess: (invitation) => {
        reset()
        toast.success(
          `Invitation sent to ${invitation.email}. They join after accepting it`,
        )
      },
    })
  }

  return (
    <form noValidate className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <FormError error={inviteMember.error} />
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <FormField
            label="Invite by email"
            type="email"
            placeholder="teammate@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <Button
          type="submit"
          className="mt-[1.625rem]"
          disabled={inviteMember.isPending}
        >
          {inviteMember.isPending ? 'Inviting…' : 'Invite'}
        </Button>
      </div>
    </form>
  )
}
