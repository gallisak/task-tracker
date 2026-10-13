import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { refreshSession } from '@/features/auth/auth-api'
import { sessionStore } from '@/features/auth/session-store'
import { taskDetailKeys } from './use-task-details'
import { taskKeys } from './use-tasks'

const TASK_EVENTS = ['task.created', 'task.updated', 'task.deleted']

export function useBoardRealtime(projectId: string): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    let hasConnected = false
    let refreshedAfterReject = false
    const socket = io({
      auth: (send) => send({ token: sessionStore.get().accessToken }),
    })

    const reloadBoard = () => {
      const boardKey = taskKeys.board(projectId)
      if (queryClient.isMutating({ mutationKey: boardKey }) === 0) {
        void queryClient.invalidateQueries({ queryKey: boardKey })
      }
      void queryClient.invalidateQueries({
        queryKey: taskDetailKeys.all,
        predicate: (query) => query.queryKey[2] === 'status-history',
      })
    }

    socket.on('connect', () => {
      socket.emit('project:join', { projectId })
      if (hasConnected) {
        reloadBoard()
      }
      hasConnected = true
      refreshedAfterReject = false
    })

    socket.on('connect_error', (error) => {
      if (error.message !== 'Unauthorized' || refreshedAfterReject) {
        return
      }
      refreshedAfterReject = true
      refreshSession()
        .then((session) => {
          sessionStore.signIn(session)
          socket.connect()
        })
        .catch(() => undefined)
    })

    for (const event of TASK_EVENTS) {
      socket.on(event, reloadBoard)
    }

    return () => {
      socket.disconnect()
    }
  }, [projectId, queryClient])
}
