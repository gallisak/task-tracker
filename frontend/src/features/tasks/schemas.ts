import { z } from 'zod'
import type { Task, UpdateTaskInput } from './types'

export const UNASSIGNED = 'unassigned'

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .trim()
    .max(5000, 'Description must be at most 5000 characters'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  assigneeId: z.string(),
  dueDate: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Enter a valid date'),
})

export type TaskFormValues = z.infer<typeof taskSchema>

export const EMPTY_TASK_VALUES: TaskFormValues = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  assigneeId: UNASSIGNED,
  dueDate: '',
}

export function toFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    assigneeId: task.assignee?.id ?? UNASSIGNED,
    dueDate: task.dueDate?.slice(0, 10) ?? '',
  }
}

export function toTaskInput(values: TaskFormValues) {
  return {
    title: values.title,
    description: values.description || null,
    status: values.status,
    priority: values.priority,
    assigneeId: values.assigneeId === UNASSIGNED ? null : values.assigneeId,
    dueDate: values.dueDate || null,
  }
}

export type TaskDirtyFields = Partial<Record<keyof TaskFormValues, boolean>>

export function toTaskUpdate(
  values: TaskFormValues,
  dirtyFields: TaskDirtyFields,
): UpdateTaskInput {
  return Object.fromEntries(
    Object.entries(toTaskInput(values)).filter(
      ([field]) => dirtyFields[field as keyof TaskFormValues],
    ),
  )
}

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be at most 2000 characters'),
})

export type CommentFormValues = z.infer<typeof commentSchema>
