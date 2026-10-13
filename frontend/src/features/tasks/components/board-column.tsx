import { useDroppable } from '@dnd-kit/core'
import { Loader2Icon } from 'lucide-react'
import { ErrorState } from '@/components/page-states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '../constants'
import type { Task, TaskFilters, TaskStatus } from '../types'
import { useColumnTasks } from '../use-tasks'
import { TaskCard } from './task-card'

function uniqueTasks(pages: { items: Task[] }[]): Task[] {
  const byId = new Map<string, Task>()
  for (const page of pages) {
    for (const task of page.items) {
      byId.set(task.id, task)
    }
  }
  return [...byId.values()]
}

interface BoardColumnProps {
  projectId: string
  status: TaskStatus
  filters: TaskFilters
  movingTaskId: string | null
  dragDisabled: boolean
  onOpenTask: (task: Task) => void
}

export function BoardColumn({
  projectId,
  status,
  filters,
  movingTaskId,
  dragDisabled,
  onOpenTask,
}: BoardColumnProps) {
  const tasks = useColumnTasks(projectId, status, filters)
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const items = tasks.data ? uniqueTasks(tasks.data.pages) : []
  const total = tasks.data?.pages[0]?.total

  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_LABELS[status]}
      className={cn(
        'flex min-h-48 flex-col gap-3 rounded-xl bg-muted/50 p-3 transition-colors',
        isOver && 'bg-muted ring-2 ring-ring/40',
      )}
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
        {total !== undefined && (
          <span className="text-xs text-muted-foreground">{total}</span>
        )}
      </header>
      {tasks.isPending ? (
        <div className="space-y-2" role="status" aria-label="Loading tasks">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : tasks.isError ? (
        <ErrorState
          title="Could not load tasks"
          message={getErrorMessage(tasks.error)}
          onAction={() => void tasks.refetch()}
        />
      ) : items.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          {filters.assigneeId || filters.priority
            ? 'No matching tasks'
            : 'No tasks'}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              dragDisabled={dragDisabled || task.id === movingTaskId}
              onOpen={onOpenTask}
            />
          ))}
        </ul>
      )}
      {tasks.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          disabled={tasks.isFetchingNextPage}
          onClick={() => void tasks.fetchNextPage()}
        >
          {tasks.isFetchingNextPage && <Loader2Icon className="animate-spin" />}
          Load more
        </Button>
      )}
    </section>
  )
}
