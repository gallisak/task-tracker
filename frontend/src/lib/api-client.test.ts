import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { httpError } from '@/test/http-error'
import {
  getErrorMessage,
  getErrorStatus,
  getRetryAfterMs,
  isNotFoundError,
  isRateLimited,
} from './api-client'

describe('isNotFoundError', () => {
  it('recognises a 404 response', () => {
    expect(isNotFoundError(httpError(404))).toBe(true)
  })

  it('does not treat a bad request as a missing resource', () => {
    expect(isNotFoundError(httpError(400))).toBe(false)
  })

  it('does not treat other failures as a missing resource', () => {
    for (const status of [401, 403, 409, 429, 500]) {
      expect(isNotFoundError(httpError(status))).toBe(false)
    }
    expect(isNotFoundError(new AxiosError('Network Error'))).toBe(false)
    expect(isNotFoundError(new Error('boom'))).toBe(false)
  })
})

describe('getErrorStatus', () => {
  it('returns the HTTP status of a failed request', () => {
    expect(getErrorStatus(httpError(400))).toBe(400)
  })

  it('returns nothing when there is no response', () => {
    expect(getErrorStatus(new AxiosError('Network Error'))).toBeUndefined()
    expect(getErrorStatus(new Error('boom'))).toBeUndefined()
  })
})

describe('getErrorMessage', () => {
  it('shows validation details of a bad request', () => {
    const error = httpError(400, {
      message: 'Validation failed',
      details: ['title is too short', 'dueDate must be a date'],
    })

    expect(getErrorMessage(error)).toBe(
      'title is too short. dueDate must be a date',
    )
  })

  it('explains an unreachable server', () => {
    expect(getErrorMessage(new AxiosError('Network Error'))).toBe(
      'Cannot reach the server. Check your connection and try again.',
    )
  })
})

describe('isRateLimited', () => {
  it('recognises a 429 response only', () => {
    expect(isRateLimited(httpError(429))).toBe(true)
    expect(isRateLimited(httpError(401))).toBe(false)
    expect(isRateLimited(new AxiosError('Network Error'))).toBe(false)
  })
})

describe('getRetryAfterMs', () => {
  it('reads the wait from a named Retry-After header', () => {
    const error = httpError(429, {}, { 'Retry-After-refresh': '12' })

    expect(getRetryAfterMs(error)).toBe(12_000)
  })

  it('reads the wait from a plain Retry-After header', () => {
    expect(getRetryAfterMs(httpError(429, {}, { 'Retry-After': '3' }))).toBe(
      3_000,
    )
  })

  it('falls back to a short wait when the header is missing', () => {
    expect(getRetryAfterMs(httpError(429))).toBe(5_000)
  })

  it('never waits longer than a minute', () => {
    const error = httpError(429, {}, { 'Retry-After': '3600' })

    expect(getRetryAfterMs(error)).toBe(60_000)
  })
})
