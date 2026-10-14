import { useMutation } from '@tanstack/react-query'
import { getRetryAfterMs, isRateLimited } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import * as authApi from './auth-api'
import { mayHaveSession, sessionStore } from './session-store'

export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: sessionStore.signIn,
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: sessionStore.signIn,
  })
}

export function endSession(): void {
  sessionStore.signOut()
  queryClient.clear()
}

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: endSession,
  })
}

export async function restoreSession(): Promise<void> {
  if (!mayHaveSession()) {
    sessionStore.signOut()
    return
  }

  for (;;) {
    try {
      sessionStore.signIn(await authApi.refreshSession())
      return
    } catch (error) {
      if (!isRateLimited(error)) {
        sessionStore.signOut()
        return
      }
      await new Promise((resolve) =>
        setTimeout(resolve, getRetryAfterMs(error)),
      )
    }
  }
}
