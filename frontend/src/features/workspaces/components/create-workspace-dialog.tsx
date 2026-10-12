import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormError } from '@/components/form-error'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { workspaceSchema, type WorkspaceFormValues } from '../schemas'
import { useCreateWorkspace } from '../use-workspaces'

export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false)
  const createWorkspace = useCreateWorkspace()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: '' },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      reset()
      createWorkspace.reset()
    }
  }

  const onSubmit = (values: WorkspaceFormValues) => {
    createWorkspace.mutate(values, {
      onSuccess: (workspace) => {
        toast.success(`Workspace "${workspace.name}" created`)
        handleOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          New workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            A workspace groups projects and the people who work on them.
          </DialogDescription>
        </DialogHeader>
        <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormError error={createWorkspace.error} />
          <FormField
            label="Name"
            autoFocus
            error={errors.name?.message}
            {...register('name')}
          />
          <DialogFooter>
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? 'Creating…' : 'Create workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
