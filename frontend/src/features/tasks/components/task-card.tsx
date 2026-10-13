import { useDraggable } from '@dnd-kit/core'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/user-avatar'
import type { Task } from '../types'
import { PriorityBadge } from './priority-badge'

const dueDateFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

interface TaskCardViewProps {
  task: Task
  className?: string
}

export function TaskCardView({ task, className }: TaskCardViewProps) {
  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border bg-card p-3 text-card-foreground shadow-xs',
        className,
      )}
    >
      <p className="text-sm font-medium break-words">{task.title}</p>
      <div className="flex items-center gap-2">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarIcon className="size-3.5" />
            {dueDateFormat.format(new Date(task.dueDate))}
          </span>
        )}
        {task.assignee && (
          <span className="ml-auto" title={task.assignee.name}>
            <UserAvatar name={task.assignee.name} className="size-6 text-xs" />
          </span>
        )}
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: Task
  isMoving: boolean
  onOpen: (task: Task) => void
}

export function TaskCard({ task, isMoving, onOpen }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: isMoving,
  })

  return (
    <li
      ref={setNodeRef}
      className={cn(
        'cursor-grab rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'opacity-40',
      )}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onOpen(task)
          return
        }
        listeners?.onKeyDown?.(event)
      }}
    >
      <TaskCardView task={task} />
    </li>
  )
}
