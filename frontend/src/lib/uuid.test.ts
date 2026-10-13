import { describe, expect, it } from 'vitest'
import { isUuid } from './uuid'

describe('isUuid', () => {
  it('accepts a UUID in either letter case', () => {
    expect(isUuid('01a135b9-fdb4-749f-9af0-4af1c704a591')).toBe(true)
    expect(isUuid('01A135B9-FDB4-749F-9AF0-4AF1C704A591')).toBe(true)
  })

  it('rejects anything that is not a UUID', () => {
    for (const value of ['', 'abc', '01a135b9fdb4749f9af04af1c704a591']) {
      expect(isUuid(value)).toBe(false)
    }
    expect(isUuid(null)).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })
})
