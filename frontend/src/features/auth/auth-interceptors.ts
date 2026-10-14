import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { isRateLimited } from '@/lib/api-client'
import { refreshSession } from './auth-api'
import { sessionStore } from './session-store'
import { endSession } from './use-auth'

type RetriableRequest = InternalAxiosRequestConfig & { retried?: boolean }

const isAuthEndpoint = (url = '') => url.startsWith('/auth/')

export function setupAuthInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    const { accessToken } = sessionStore.get()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  })

  client.interceptors.response.use(undefined, async (error: AxiosError) => {
    const request = error.config as RetriableRequest | undefined
    const expired =
      error.response?.status === 401 &&
      request !== undefined &&
      !request.retried &&
      !isAuthEndpoint(request.url)

    if (!expired) {
      throw error
    }

    try {
      sessionStore.signIn(await refreshSession())
    } catch (refreshError) {
      if (isRateLimited(refreshError)) {
        throw refreshError
      }
      endSession()
      throw error
    }

    request.retried = true
    return client(request)
  })
}
