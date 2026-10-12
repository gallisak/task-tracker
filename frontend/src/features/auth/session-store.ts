import { useSyncExternalStore } from 'react'
import type { AuthResponse, User } from './types'

export type Session =
  | { status: 'loading'; user: null; accessToken: null }
  | { status: 'anonymous'; user: null; accessToken: null }
  | { status: 'authenticated'; user: User; accessToken: string }

const ANONYMOUS: Session = {
  status: 'anonymous',
  user: null,
  accessToken: null,
}

const SESSION_HINT_KEY = 'task-tracker:has-session'

function rememberSession(exists: boolean): void {
  try {
    if (exists) {
      localStorage.setItem(SESSION_HINT_KEY, '1')
    } else {
      localStorage.removeItem(SESSION_HINT_KEY)
    }
  } catch {
    return
  }
}

export function mayHaveSession(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) !== null
  } catch {
    return true
  }
}

let session: Session = { status: 'loading', user: null, accessToken: null }
const listeners = new Set<() => void>()

function publish(next: Session): void {
  session = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const sessionStore = {
  get: (): Session => session,
  signIn: ({ accessToken, user }: AuthResponse): void => {
    rememberSession(true)
    publish({ status: 'authenticated', user, accessToken })
  },
  signOut: (): void => {
    rememberSession(false)
    if (session.status !== 'anonymous') {
      publish(ANONYMOUS)
    }
  },
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, sessionStore.get)
}
