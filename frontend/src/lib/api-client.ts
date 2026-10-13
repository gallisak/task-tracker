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

export function isNotFoundError(error: unknown): boolean {
  const status = getErrorStatus(error)
  return status === 404 || status === 400
}
