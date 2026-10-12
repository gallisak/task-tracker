import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import type { AuthResponse, LoginInput, RegisterInput } from './types'

const REFRESH_LOCK = 'task-tracker-auth-refresh'

const refreshClient = axios.create({ baseURL: '/api', withCredentials: true })

let pendingRefresh: Promise<AuthResponse> | null = null

async function requestRefresh(): Promise<AuthResponse> {
  const { data } = await refreshClient.post<AuthResponse>('/auth/refresh')
  return data
}

async function refreshExclusively(): Promise<AuthResponse> {
  if (!navigator.locks) {
    return requestRefresh()
  }
  return navigator.locks.request(REFRESH_LOCK, requestRefresh)
}

export function refreshSession(): Promise<AuthResponse> {
  pendingRefresh ??= refreshExclusively().finally(() => {
    pendingRefresh = null
  })
  return pendingRefresh
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', input)
  return data
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', input)
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}
