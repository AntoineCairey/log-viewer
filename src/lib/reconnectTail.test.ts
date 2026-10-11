import { describe, expect, it } from 'vitest'
import { API_TAIL_LIMIT, reconnectTail } from './reconnectTail.ts'

describe('reconnectTail', () => {
  const now = 10_000

  it('couvre le trou estimé, avec une marge', () => {
    expect(reconnectTail(now - 4_000, now)).toBe(150)
  })

  it('garde la marge quand le dernier log est tout récent', () => {
    expect(reconnectTail(now, now)).toBe(50)
  })

  it('ne dépasse pas le plafond de l’API', () => {
    expect(reconnectTail(now - 10 * 60_000, now)).toBe(API_TAIL_LIMIT)
  })
})
