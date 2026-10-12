import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormError } from '@/components/form-error'
import { FormField } from '@/components/form-field'
import { FormTextarea } from '@/components/form-textarea'
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
import { projectSchema, type ProjectFormValues } from '../schemas'
import { useCreateProject } from '../use-projects'

export function CreateProjectDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false)
  const createProject = useCreateProject(workspaceId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', description: '' },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      reset()
      createProject.reset()
    }
  }

  const onSubmit = (values: ProjectFormValues) => {
    createProject.mutate(
      { name: values.name, description: values.description || undefined },
      {
        onSuccess: (project) => {
          toast.success(`Project "${project.name}" created`)
          handleOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Each project has its own board of tasks.
          </DialogDescription>
        </DialogHeader>
        <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormError error={createProject.error} />
          <FormField
            label="Name"
            autoFocus
            error={errors.name?.message}
            {...register('name')}
          />
          <FormTextarea
            label="Description"
            rows={3}
            error={errors.description?.message}
            {...register('description')}
          />
          <DialogFooter>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
