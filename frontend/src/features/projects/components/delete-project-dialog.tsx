import { useState } from 'react'
import { Trash2Icon } from 'lucide-react'
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
import type { Project } from '../types'
import { useDeleteProject } from '../use-projects'

export function DeleteProjectDialog({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)
  const deleteProject = useDeleteProject(project.workspaceId)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      deleteProject.reset()
    }
  }

  const onConfirm = () => {
    deleteProject.mutate(project.id, {
      onSuccess: () => {
        toast.success(`Project "${project.name}" deleted`)
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
          aria-label={`Delete project ${project.name}`}
        >
          <Trash2Icon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            "{project.name}" and all of its tasks will be deleted. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <FormError error={deleteProject.error} />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={deleteProject.isPending}
            onClick={onConfirm}
          >
            {deleteProject.isPending ? 'Deleting…' : 'Delete project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
