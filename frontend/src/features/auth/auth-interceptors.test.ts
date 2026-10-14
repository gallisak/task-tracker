import axios, { type AxiosAdapter } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpError } from '@/test/http-error'
import * as authApi from './auth-api'
import { setupAuthInterceptors } from './auth-interceptors'
import { sessionStore } from './session-store'

vi.mock('./auth-api', () => ({
  refreshSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

const refreshSession = vi.mocked(authApi.refreshSession)

const user = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function clientAnswering(status: number) {
  const adapter: AxiosAdapter = async () => {
    throw httpError(status)
  }
  const client = axios.create({ adapter })
  setupAuthInterceptors(client)
  return client
}

describe('auth interceptors', () => {
  beforeEach(() => {
    refreshSession.mockReset()
    sessionStore.signIn({ accessToken: 'expired', user })
  })

  it('keeps the session when the refresh is only rate limited', async () => {
    refreshSession.mockRejectedValueOnce(httpError(429))

    await expect(clientAnswering(401).get('/tasks')).rejects.toMatchObject({
      response: { status: 429 },
    })

    expect(sessionStore.get().status).toBe('authenticated')
  })

  it('ends the session when the refresh token is rejected', async () => {
    refreshSession.mockRejectedValueOnce(httpError(401))

    await expect(clientAnswering(401).get('/tasks')).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(sessionStore.get().status).toBe('anonymous')
  })
})
