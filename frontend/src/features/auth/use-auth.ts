import { useMutation } from '@tanstack/react-query'
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

export function useLogout() {
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      sessionStore.signOut()
      queryClient.clear()
    },
  })
}

export async function restoreSession(): Promise<void> {
  if (!mayHaveSession()) {
    sessionStore.signOut()
    return
  }

  try {
    sessionStore.signIn(await authApi.refreshSession())
  } catch {
    sessionStore.signOut()
  }
}
