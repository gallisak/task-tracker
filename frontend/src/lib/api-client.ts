import axios, { AxiosError } from 'axios'

export interface ApiErrorBody {
  statusCode: number
  error: string
  message: string
  details?: string[]
}

const REQUEST_TIMEOUT_MS = 15_000

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
})

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 429) {
      return 'Too many attempts. Please wait a minute and try again.'
    }
    const body = error.response?.data as Partial<ApiErrorBody> | undefined
    if (body?.details?.length) {
      return body.details.join('. ')
    }
    if (body?.message) {
      return body.message
    }
    if (!error.response) {
      return 'Cannot reach the server. Check your connection and try again.'
    }
  }
  return 'Something went wrong. Please try again.'
}

export function getErrorStatus(error: unknown): number | undefined {
  return error instanceof AxiosError ? error.response?.status : undefined
}

const DEFAULT_RETRY_AFTER_MS = 5_000
const MAX_RETRY_AFTER_MS = 60_000

export function isRateLimited(error: unknown): boolean {
  return getErrorStatus(error) === 429
}

export function getRetryAfterMs(error: unknown): number {
  const headers: object =
    error instanceof AxiosError ? (error.response?.headers ?? {}) : {}
  const value = Object.entries(headers).find(([name]) =>
    name.toLowerCase().startsWith('retry-after'),
  )?.[1]
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS)
    : DEFAULT_RETRY_AFTER_MS
}

export function isNotFoundError(error: unknown): boolean {
  return getErrorStatus(error) === 404
}
