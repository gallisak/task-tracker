import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMembers } from '@/features/workspaces/use-members'
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../constants'
import type { BoardFilterValues, TaskPriority, TaskStatus } from '../types'

const ALL = 'all'

interface BoardFiltersProps {
  workspaceId: string
  filters: BoardFilterValues
  onChange: (filters: BoardFilterValues) => void
}

export function BoardFilters({
  workspaceId,
  filters,
  onChange,
}: BoardFiltersProps) {
  const members = useMembers(workspaceId)
  const hasFilters = Boolean(
    filters.status ?? filters.assigneeId ?? filters.priority,
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.status ?? ALL}
        onValueChange={(value) =>
          onChange({
            ...filters,
            status: value === ALL ? undefined : (value as TaskStatus),
          })
        }
      >
        <SelectTrigger aria-label="Filter by status" className="min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {TASK_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.assigneeId ?? ALL}
        onValueChange={(value) =>
          onChange({
            ...filters,
            assigneeId: value === ALL ? undefined : value,
          })
        }
      >
        <SelectTrigger aria-label="Filter by assignee" className="min-w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All assignees</SelectItem>
          {members.data?.map((member) => (
            <SelectItem key={member.user.id} value={member.user.id}>
              {member.user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.priority ?? ALL}
        onValueChange={(value) =>
          onChange({
            ...filters,
            priority: value === ALL ? undefined : (value as TaskPriority),
          })
        }
      >
        <SelectTrigger aria-label="Filter by priority" className="min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {TASK_PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <XIcon />
          Clear filters
        </Button>
      )}
    </div>
  )
}
