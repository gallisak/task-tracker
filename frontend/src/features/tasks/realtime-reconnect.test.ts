import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '@/features/auth/auth-api'
import { sessionStore } from '@/features/auth/session-store'
import type { AuthResponse } from '@/features/auth/types'
import { httpError } from '@/test/http-error'
import { reconnectWithFreshToken } from './realtime-reconnect'

vi.mock('@/features/auth/auth-api', () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

const refreshSession = vi.mocked(authApi.refreshSession)

const session: AuthResponse = {
  accessToken: 'fresh-token',
  user: {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
}

describe('reconnectWithFreshToken', () => {
  const socket = { connect: vi.fn() }

  beforeEach(() => {
    vi.useFakeTimers()
    refreshSession.mockReset()
    socket.connect.mockReset()
    sessionStore.signOut()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('connects again with a fresh session', async () => {
    refreshSession.mockResolvedValueOnce(session)

    reconnectWithFreshToken(socket, () => true)
    await vi.advanceTimersByTimeAsync(0)

    expect(sessionStore.get()).toMatchObject({ accessToken: 'fresh-token' })
    expect(socket.connect).toHaveBeenCalledTimes(1)
  })

  it('waits out a rate limit and tries again', async () => {
    refreshSession
      .mockRejectedValueOnce(httpError(429, {}, { 'Retry-After-refresh': '2' }))
      .mockResolvedValueOnce(session)

    reconnectWithFreshToken(socket, () => true)
    await vi.advanceTimersByTimeAsync(1_999)
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(socket.connect).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)

    expect(refreshSession).toHaveBeenCalledTimes(2)
    expect(socket.connect).toHaveBeenCalledTimes(1)
  })

  it('gives up when the session is rejected', async () => {
    refreshSession.mockRejectedValueOnce(httpError(401))

    reconnectWithFreshToken(socket, () => true)
    await vi.advanceTimersByTimeAsync(60_000)

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(socket.connect).not.toHaveBeenCalled()
  })

  it('stops trying once the board is closed', async () => {
    let isActive = true
    refreshSession.mockRejectedValueOnce(
      httpError(429, {}, { 'Retry-After-refresh': '2' }),
    )

    reconnectWithFreshToken(socket, () => isActive)
    await vi.advanceTimersByTimeAsync(0)
    isActive = false
    await vi.advanceTimersByTimeAsync(60_000)

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(socket.connect).not.toHaveBeenCalled()
  })
})
