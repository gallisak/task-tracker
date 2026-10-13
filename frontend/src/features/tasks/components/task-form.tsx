import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { FormError } from '@/components/form-error'
import { FormField } from '@/components/form-field'
import { FormSelect, type SelectOption } from '@/components/form-select'
import { FormTextarea } from '@/components/form-textarea'
import { Button } from '@/components/ui/button'
import { useMembers } from '@/features/workspaces/use-members'
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../constants'
import { taskSchema, UNASSIGNED, type TaskFormValues } from '../schemas'

const STATUS_OPTIONS: SelectOption[] = TASK_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}))

const PRIORITY_OPTIONS: SelectOption[] = TASK_PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
}))

interface TaskFormProps {
  workspaceId: string
  defaultValues: TaskFormValues
  submitLabel: string
  pendingLabel: string
  isPending: boolean
  error: unknown
  onSubmit: (values: TaskFormValues) => void
  secondaryAction?: ReactNode
}

export function TaskForm({
  workspaceId,
  defaultValues,
  submitLabel,
  pendingLabel,
  isPending,
  error,
  onSubmit,
  secondaryAction,
}: TaskFormProps) {
  const members = useMembers(workspaceId)
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues,
  })

  const assigneeOptions: SelectOption[] = [
    { value: UNASSIGNED, label: 'Unassigned' },
    ...(members.data ?? []).map((member) => ({
      value: member.user.id,
      label: member.user.name,
    })),
  ]

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormError error={error ?? members.error} />
      <FormField
        label="Title"
        autoFocus
        error={errors.title?.message}
        {...register('title')}
      />
      <FormTextarea
        label="Description"
        rows={4}
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <FormSelect
              label="Status"
              value={field.value}
              options={STATUS_OPTIONS}
              onValueChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <FormSelect
              label="Priority"
              value={field.value}
              options={PRIORITY_OPTIONS}
              onValueChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="assigneeId"
          render={({ field }) => (
            <FormSelect
              label="Assignee"
              value={field.value}
              options={assigneeOptions}
              disabled={members.isPending}
              onValueChange={field.onChange}
            />
          )}
        />
        <FormField
          label="Due date"
          type="date"
          error={errors.dueDate?.message}
          {...register('dueDate')}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>{secondaryAction}</div>
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
