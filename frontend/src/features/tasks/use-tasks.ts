import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { moveTaskInColumns, type ColumnData } from './board-cache'
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

const boardsToReload = new Set<string>()

function reloadBoardAfterLastMutation(
  queryClient: QueryClient,
  projectId: string,
  boardChanged: boolean,
): void {
  if (boardChanged) {
    boardsToReload.add(projectId)
  }

  const boardKey = taskKeys.board(projectId)
  if (
    queryClient.isMutating({ mutationKey: boardKey }) > 1 ||
    !boardsToReload.delete(projectId)
  ) {
    return
  }
  void queryClient.invalidateQueries({ queryKey: boardKey })
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
        cursor: pageParam,
        limit: COLUMN_PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: taskKeys.board(projectId),
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      tasksApi.updateTask(taskId, { status }),
    onMutate: async ({ taskId, status }) => {
      const queryKey = taskKeys.board(projectId)
      await queryClient.cancelQueries({ queryKey })

      const previous = queryClient.getQueriesData<ColumnData>({ queryKey })
      for (const [key, data] of moveTaskInColumns(previous, taskId, status)) {
        queryClient.setQueryData(key, data)
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: taskDetailKeys.statusHistory(task.id),
      })
    },
    onSettled: () => reloadBoardAfterLastMutation(queryClient, projectId, true),
  })
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: taskKeys.board(projectId),
    mutationFn: (input: CreateTaskInput) =>
      tasksApi.createTask(projectId, input),
    onSettled: (_data, error) =>
      reloadBoardAfterLastMutation(queryClient, projectId, !error),
  })
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: taskKeys.board(projectId),
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      tasksApi.updateTask(taskId, input),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({
        queryKey: taskDetailKeys.statusHistory(task.id),
      })
    },
    onSettled: (_data, error) =>
      reloadBoardAfterLastMutation(queryClient, projectId, !error),
  })
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: taskKeys.board(projectId),
    mutationFn: tasksApi.deleteTask,
    onSettled: (_data, error) =>
      reloadBoardAfterLastMutation(queryClient, projectId, !error),
  })
}
