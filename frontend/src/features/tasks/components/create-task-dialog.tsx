import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  EMPTY_TASK_VALUES,
  toTaskInput,
  type TaskFormValues,
} from '../schemas'
import { useCreateTask } from '../use-tasks'
import { TaskForm } from './task-form'

interface CreateTaskDialogProps {
  projectId: string
  workspaceId: string
}

export function CreateTaskDialog({
  projectId,
  workspaceId,
}: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const createTask = useCreateTask(projectId)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      createTask.reset()
    }
  }

  const onSubmit = (values: TaskFormValues) => {
    createTask.mutate(toTaskInput(values), {
      onSuccess: () => {
        toast.success('Task created')
        handleOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          New task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            Describe the work and choose where it starts on the board.
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          workspaceId={workspaceId}
          defaultValues={EMPTY_TASK_VALUES}
          submitLabel="Create task"
          pendingLabel="Creating…"
          isPending={createTask.isPending}
          error={createTask.error}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
