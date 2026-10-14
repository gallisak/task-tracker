import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpError } from '@/test/http-error'
import * as authApi from './auth-api'
import { sessionStore } from './session-store'
import type { AuthResponse } from './types'
import { restoreSession } from './use-auth'

vi.mock('./auth-api', () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

const refreshSession = vi.mocked(authApi.refreshSession)

const session: AuthResponse = {
  accessToken: 'access-token',
  user: {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
}

describe('restoreSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    refreshSession.mockReset()
    sessionStore.signOut()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits out a rate limit and then signs in', async () => {
    refreshSession
      .mockRejectedValueOnce(
        httpError(429, {}, { 'Retry-After-refresh': '2' }),
      )
      .mockResolvedValueOnce(session)

    const restoring = restoreSession()
    await vi.advanceTimersByTimeAsync(1_999)
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(sessionStore.get().status).not.toBe('authenticated')

    await vi.advanceTimersByTimeAsync(1)
    await restoring

    expect(refreshSession).toHaveBeenCalledTimes(2)
    expect(sessionStore.get()).toMatchObject({
      status: 'authenticated',
      accessToken: 'access-token',
    })
  })

  it('signs out when the refresh token is rejected', async () => {
    refreshSession.mockRejectedValueOnce(httpError(401))

    await restoreSession()

    expect(sessionStore.get().status).toBe('anonymous')
  })

  it('signs out when the server cannot be reached', async () => {
    refreshSession.mockRejectedValueOnce(new AxiosError('Network Error'))

    await restoreSession()

    expect(sessionStore.get().status).toBe('anonymous')
  })
})
