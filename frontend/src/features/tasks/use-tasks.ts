import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { COLUMN_PAGE_SIZE } from './constants'
import * as tasksApi from './tasks-api'
import { taskDetailKeys } from './use-task-details'
import type {
  CreateTaskInput,
  TaskFilters,
  TaskStatus,
  UpdateTaskInput,
} from './types'

export const taskKeys = {
  board: (projectId: string) => ['projects', projectId, 'tasks'] as const,
  column: (projectId: string, status: TaskStatus, filters: TaskFilters) =>
    [...taskKeys.board(projectId), status, filters] as const,
}

export function useColumnTasks(
  projectId: string,
  status: TaskStatus,
  filters: TaskFilters,
) {
  return useInfiniteQuery({
    queryKey: taskKeys.column(projectId, status, filters),
    queryFn: ({ pageParam }) =>
      tasksApi.fetchTasks(projectId, {
        ...filters,
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
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: taskDetailKeys.statusHistory(task.id),
      })
      return queryClient.invalidateQueries({
        queryKey: taskKeys.board(projectId),
      })
    },
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
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: taskDetailKeys.statusHistory(task.id),
      })
      return queryClient.invalidateQueries({
        queryKey: taskKeys.board(projectId),
      })
    },
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
