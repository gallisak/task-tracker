import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { getErrorMessage, getErrorStatus, isNotFoundError } from './api-client'

function httpError(status: number, data: unknown = {}): AxiosError {
  const config = { headers: new AxiosHeaders() }
  const response: AxiosResponse = {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  }
  return new AxiosError('Request failed', undefined, config, null, response)
}

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
