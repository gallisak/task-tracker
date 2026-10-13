import type { UserSummary } from '@/features/workspaces/types'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  assignee: UserSummary | null
  creator: UserSummary
  createdAt: string
  updatedAt: string
}

export interface TaskPage {
  items: Task[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TaskFilters {
  priority?: TaskPriority
  assigneeId?: string
}

export interface TaskListParams extends TaskFilters {
  status?: TaskStatus
  page: number
  limit: number
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string | null
  dueDate?: string | null
}

export interface Comment {
  id: string
  taskId: string
  body: string
  author: UserSummary
  createdAt: string
  updatedAt: string
}

export interface StatusChange {
  id: string
  fromStatus: TaskStatus
  toStatus: TaskStatus
  changedBy: UserSummary
  changedAt: string
}
