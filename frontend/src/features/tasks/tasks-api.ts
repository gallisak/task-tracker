import { apiClient } from '@/lib/api-client'
import type {
  CreateTaskInput,
  Task,
  TaskListParams,
  TaskPage,
  UpdateTaskInput,
} from './types'

export async function fetchTasks(
  projectId: string,
  params: TaskListParams,
): Promise<TaskPage> {
  const { data } = await apiClient.get<TaskPage>(
    `/projects/${projectId}/tasks`,
    { params },
  )
  return data
}

export async function createTask(
  projectId: string,
  input: CreateTaskInput,
): Promise<Task> {
  const { data } = await apiClient.post<Task>(
    `/projects/${projectId}/tasks`,
    input,
  )
  return data
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${taskId}`, input)
  return data
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`)
}
