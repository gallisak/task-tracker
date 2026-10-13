import { useSearchParams } from 'react-router-dom'
import { TASK_PRIORITIES } from './constants'
import type { TaskFilters, TaskPriority } from './types'

const ASSIGNEE_PARAM = 'assignee'
const PRIORITY_PARAM = 'priority'
const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

function parseAssignee(value: string | null): string | undefined {
  return value && UUID_PATTERN.test(value) ? value : undefined
}

function parsePriority(value: string | null): TaskPriority | undefined {
  return TASK_PRIORITIES.find((priority) => priority === value)
}

export function useBoardFilters(): [
  TaskFilters,
  (filters: TaskFilters) => void,
] {
  const [params, setParams] = useSearchParams()

  const filters: TaskFilters = {
    assigneeId: parseAssignee(params.get(ASSIGNEE_PARAM)),
    priority: parsePriority(params.get(PRIORITY_PARAM)),
  }

  const setFilters = (next: TaskFilters) => {
    const nextParams = new URLSearchParams()
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
