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

export interface TaskListParams {
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
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
