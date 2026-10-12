import { useState } from 'react'
import { UserMinusIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FormError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { Member } from '../types'
import { useRemoveMember } from '../use-members'

interface RemoveMemberDialogProps {
  workspaceId: string
  member: Member
  isSelf: boolean
}

export function RemoveMemberDialog({
  workspaceId,
  member,
  isSelf,
}: RemoveMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const removeMember = useRemoveMember(workspaceId)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      removeMember.reset()
    }
  }

  const onConfirm = () => {
    removeMember.mutate(member.user.id, {
      onSuccess: () => {
        if (isSelf) {
          toast.success('You left the workspace')
          void navigate('/')
          return
        }
        toast.success(`${member.user.name} was removed`)
        setOpen(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${member.user.name}`}
        >
          <UserMinusIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSelf ? 'Leave workspace' : 'Remove member'}</DialogTitle>
          <DialogDescription>
            {isSelf
              ? 'You will lose access to this workspace and its projects.'
              : `${member.user.name} will lose access to this workspace and its projects.`}
          </DialogDescription>
        </DialogHeader>
        <FormError error={removeMember.error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={removeMember.isPending}
            onClick={onConfirm}
          >
            {removeMember.isPending
              ? 'Removing…'
              : isSelf
                ? 'Leave workspace'
                : 'Remove member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
