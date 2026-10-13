import { apiClient } from '@/lib/api-client'
import type { Comment, StatusChange } from './types'

export async function fetchComments(taskId: string): Promise<Comment[]> {
  const { data } = await apiClient.get<Comment[]>(`/tasks/${taskId}/comments`)
  return data
}

export async function createComment(
  taskId: string,
  body: string,
): Promise<Comment> {
  const { data } = await apiClient.post<Comment>(`/tasks/${taskId}/comments`, {
    body,
  })
  return data
}

export async function updateComment(
  commentId: string,
  body: string,
): Promise<Comment> {
  const { data } = await apiClient.patch<Comment>(`/comments/${commentId}`, {
    body,
  })
  return data
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(`/comments/${commentId}`)
}

export async function fetchStatusHistory(
  taskId: string,
): Promise<StatusChange[]> {
  const { data } = await apiClient.get<StatusChange[]>(
    `/tasks/${taskId}/status-history`,
  )
  return data
}
