import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { COLUMN_PAGE_SIZE } from './constants'
import * as tasksApi from './tasks-api'
import type { CreateTaskInput, TaskStatus, UpdateTaskInput } from './types'

export const taskKeys = {
  board: (projectId: string) => ['projects', projectId, 'tasks'] as const,
  column: (projectId: string, status: TaskStatus) =>
    [...taskKeys.board(projectId), status] as const,
}

export function useColumnTasks(projectId: string, status: TaskStatus) {
  return useInfiniteQuery({
    queryKey: taskKeys.column(projectId, status),
    queryFn: ({ pageParam }) =>
      tasksApi.fetchTasks(projectId, {
        status,
        page: pageParam,
        limit: COLUMN_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })
}

export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      tasksApi.updateTask(taskId, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: taskKeys.board(projectId) }),
  })
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      tasksApi.createTask(projectId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: taskKeys.board(projectId) }),
  })
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      tasksApi.updateTask(taskId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: taskKeys.board(projectId) }),
  })
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksApi.deleteTask,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: taskKeys.board(projectId) }),
  })
}
