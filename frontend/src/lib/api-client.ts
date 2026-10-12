import axios, { AxiosError } from 'axios'

export interface ApiErrorBody {
  statusCode: number
  error: string
  message: string
  details?: string[]
}

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
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
