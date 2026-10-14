import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import { sessionStore } from '@/features/auth/session-store'
import { reconnectWithFreshToken } from './realtime-reconnect'
import { taskDetailKeys } from './use-task-details'
import { taskKeys } from './use-tasks'

const TASK_EVENTS = ['task.created', 'task.updated', 'task.deleted']
const JOIN_TIMEOUT_MS = 5_000
const JOIN_TOAST_ID = 'board-realtime'
const SERVER_DISCONNECT = 'io server disconnect'

interface JoinResult {
  ok: boolean
  error?: string
}

export function useBoardRealtime(projectId: string): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    let isActive = true
    let hasConnected = false
    let refreshedAfterReject = false
    const socket = io({
      auth: (send) => send({ token: sessionStore.get().accessToken }),
    })

    const reloadBoard = () => {
      void queryClient.invalidateQueries({
        queryKey: taskKeys.board(projectId),
      })
      void queryClient.invalidateQueries({
        queryKey: taskDetailKeys.all,
        predicate: (query) => query.queryKey[2] === 'status-history',
      })
    }

    socket.on('connect', () => {
      socket
        .timeout(JOIN_TIMEOUT_MS)
        .emit(
          'project:join',
          { projectId },
          (error: Error | null, result?: JoinResult) => {
            if (!isActive) {
              return
            }
            if (!error && result?.ok) {
              toast.dismiss(JOIN_TOAST_ID)
              return
            }
            toast.error('Live updates are unavailable', {
              id: JOIN_TOAST_ID,
              description: result?.error,
            })
          },
        )
      if (hasConnected) {
        reloadBoard()
      }
      hasConnected = true
      refreshedAfterReject = false
    })

    const reconnect = () => reconnectWithFreshToken(socket, () => isActive)

    socket.on('connect_error', (error) => {
      if (error.message !== 'Unauthorized' || refreshedAfterReject) {
        return
      }
      refreshedAfterReject = true
      reconnect()
    })

    socket.on('disconnect', (reason) => {
      if (reason === SERVER_DISCONNECT && isActive) {
        reconnect()
      }
    })

    for (const event of TASK_EVENTS) {
      socket.on(event, reloadBoard)
    }

    return () => {
      isActive = false
      socket.disconnect()
    }
  }, [projectId, queryClient])
}
