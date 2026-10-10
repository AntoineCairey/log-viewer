import { describe, expect, it } from 'vitest'
import { DEFAULT_RETRY_DELAY_MS, parseRetryAfter } from './retryAfter.ts'

describe('parseRetryAfter', () => {
  it('convertit un délai en secondes', () => {
    expect(parseRetryAfter('4')).toBe(4_000)
  })

  it('calcule le délai d’une date HTTP', () => {
    const now = Date.parse('2026-10-10T14:36:34Z')

    expect(parseRetryAfter('Sat, 10 Oct 2026 14:36:38 GMT', now)).toBe(4_000)
  })

  it('retombe sur 5 secondes si l’en-tête est absent ou illisible', () => {
    expect(parseRetryAfter(null)).toBe(DEFAULT_RETRY_DELAY_MS)
    expect(parseRetryAfter('bientôt')).toBe(DEFAULT_RETRY_DELAY_MS)
  })
})
