import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as detailsApi from './task-details-api'

export const taskDetailKeys = {
  all: ['tasks'] as const,
  comments: (taskId: string) => ['tasks', taskId, 'comments'] as const,
  statusHistory: (taskId: string) =>
    ['tasks', taskId, 'status-history'] as const,
}

export function useComments(taskId: string) {
  return useQuery({
    queryKey: taskDetailKeys.comments(taskId),
    queryFn: () => detailsApi.fetchComments(taskId),
  })
}

export function useStatusHistory(taskId: string) {
  return useQuery({
    queryKey: taskDetailKeys.statusHistory(taskId),
    queryFn: () => detailsApi.fetchStatusHistory(taskId),
  })
}

function useInvalidateComments(taskId: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: taskDetailKeys.comments(taskId),
    })
}

export function useCreateComment(taskId: string) {
  return useMutation({
    mutationFn: (body: string) => detailsApi.createComment(taskId, body),
    onSuccess: useInvalidateComments(taskId),
  })
}

export function useUpdateComment(taskId: string) {
  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      detailsApi.updateComment(commentId, body),
    onSuccess: useInvalidateComments(taskId),
  })
}

export function useDeleteComment(taskId: string) {
  return useMutation({
    mutationFn: detailsApi.deleteComment,
    onSuccess: useInvalidateComments(taskId),
  })
}
