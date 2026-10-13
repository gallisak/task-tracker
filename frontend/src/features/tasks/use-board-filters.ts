import { useSearchParams } from 'react-router-dom'
import { isUuid } from '@/lib/uuid'
import { TASK_PRIORITIES, TASK_STATUSES } from './constants'
import type { BoardFilterValues, TaskPriority, TaskStatus } from './types'

const STATUS_PARAM = 'status'
const ASSIGNEE_PARAM = 'assignee'
const PRIORITY_PARAM = 'priority'
function parseStatus(value: string | null): TaskStatus | undefined {
  return TASK_STATUSES.find((status) => status === value)
}

function parseAssignee(value: string | null): string | undefined {
  return isUuid(value) ? value : undefined
}

function parsePriority(value: string | null): TaskPriority | undefined {
  return TASK_PRIORITIES.find((priority) => priority === value)
}

export function useBoardFilters(): [
  BoardFilterValues,
  (filters: BoardFilterValues) => void,
] {
  const [params, setParams] = useSearchParams()

  const filters: BoardFilterValues = {
    status: parseStatus(params.get(STATUS_PARAM)),
    assigneeId: parseAssignee(params.get(ASSIGNEE_PARAM)),
    priority: parsePriority(params.get(PRIORITY_PARAM)),
  }

  const setFilters = (next: BoardFilterValues) => {
    const nextParams = new URLSearchParams()
    if (next.status) {
      nextParams.set(STATUS_PARAM, next.status)
    }
    if (next.assigneeId) {
      nextParams.set(ASSIGNEE_PARAM, next.assigneeId)
    }
    if (next.priority) {
      nextParams.set(PRIORITY_PARAM, next.priority)
    }
    setParams(nextParams, { replace: true })
  }

  return [filters, setFilters]
}
