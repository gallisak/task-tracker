import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FormError } from '@/components/form-error'
import { ErrorState } from '@/components/page-states'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useSession } from '@/features/auth/session-store'
import { useAcceptInvitation } from '../use-members'

export function AcceptInvitationPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useSession()
  const acceptInvitation = useAcceptInvitation()
  const token = params.get('token')

  if (!token) {
    return (
      <ErrorState
        title="Invitation link is incomplete"
        message="Open the link from your invitation again."
      />
    )
  }

  const onAccept = () => {
    acceptInvitation.mutate(token, {
      onSuccess: ({ workspaceId }) => {
        toast.success('You joined the workspace')
        navigate(`/workspaces/${workspaceId}`, { replace: true })
      },
    })
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Workspace invitation</CardTitle>
        <CardDescription>
          You are signed in as {user?.email}. The invitation works only for the
          email it was sent to.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormError error={acceptInvitation.error} />
        <div className="flex gap-2">
          <Button disabled={acceptInvitation.isPending} onClick={onAccept}>
            {acceptInvitation.isPending ? 'Joining…' : 'Accept invitation'}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/', { replace: true })}
          >
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
