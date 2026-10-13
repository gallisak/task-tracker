import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  toFormValues,
  toTaskUpdate,
  type TaskDirtyFields,
  type TaskFormValues,
} from '../schemas'
import type { Task } from '../types'
import { useDeleteTask, useUpdateTask } from '../use-tasks'
import { TaskComments } from './task-comments'
import { TaskForm } from './task-form'
import { TaskHistory } from './task-history'

interface DeleteTaskActionProps {
  isPending: boolean
  onConfirm: () => void
}

function DeleteTaskAction({ isPending, onConfirm }: DeleteTaskActionProps) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        Delete task
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="destructive"
        disabled={isPending}
        onClick={onConfirm}
      >
        {isPending ? 'Deleting…' : 'Confirm delete'}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  )
}

interface EditTaskDialogProps {
  projectId: string
  workspaceId: string
  task: Task | null
  onClose: () => void
}

export function EditTaskDialog({
  projectId,
  workspaceId,
  task,
  onClose,
}: EditTaskDialogProps) {
  const updateTask = useUpdateTask(projectId)
  const deleteTask = useDeleteTask(projectId)

  const close = () => {
    updateTask.reset()
    deleteTask.reset()
    onClose()
  }

  const onSubmit = (
    taskId: string,
    values: TaskFormValues,
    dirtyFields: TaskDirtyFields,
  ) => {
    const input = toTaskUpdate(values, dirtyFields)
    if (Object.keys(input).length === 0) {
      close()
      return
    }
    updateTask.mutate(
      { taskId, input },
      {
        onSuccess: () => {
          toast.success('Task saved')
          close()
        },
      },
    )
  }

  const onDelete = (taskId: string) => {
    deleteTask.mutate(taskId, {
      onSuccess: () => {
        toast.success('Task deleted')
        close()
      },
    })
  }

  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            {task ? `Created by ${task.creator.name}` : ''}
          </DialogDescription>
        </DialogHeader>
        {task && (
          <Tabs key={task.id} defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent
              value="details"
              forceMount
              className="pt-2 data-[state=inactive]:hidden"
            >
              <TaskForm
                workspaceId={workspaceId}
                defaultValues={toFormValues(task)}
                submitLabel="Save changes"
                pendingLabel="Saving…"
                isPending={updateTask.isPending}
                error={updateTask.error ?? deleteTask.error}
                onSubmit={(values, dirtyFields) =>
                  onSubmit(task.id, values, dirtyFields)
                }
                secondaryAction={
                  <DeleteTaskAction
                    isPending={deleteTask.isPending}
                    onConfirm={() => onDelete(task.id)}
                  />
                }
              />
            </TabsContent>
            <TabsContent value="comments" className="pt-2">
              <TaskComments taskId={task.id} />
            </TabsContent>
            <TabsContent value="history" className="pt-2">
              <TaskHistory taskId={task.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
