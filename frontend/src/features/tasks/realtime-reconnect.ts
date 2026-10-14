import { refreshSession } from '@/features/auth/auth-api'
import { sessionStore } from '@/features/auth/session-store'
import { getRetryAfterMs, isRateLimited } from '@/lib/api-client'

interface Reconnectable {
  connect(): void
}

export function reconnectWithFreshToken(
  socket: Reconnectable,
  isActive: () => boolean,
): void {
  refreshSession()
    .then((session) => {
      sessionStore.signIn(session)
      if (isActive()) {
        socket.connect()
      }
    })
    .catch((error: unknown) => {
      if (!isRateLimited(error)) {
        return
      }
      setTimeout(() => {
        if (isActive()) {
          reconnectWithFreshToken(socket, isActive)
        }
      }, getRetryAfterMs(error))
    })
}
