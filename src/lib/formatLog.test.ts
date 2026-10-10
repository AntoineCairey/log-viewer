import { describe, expect, it } from 'vitest'
import { formatDuration, httpStatusTone } from './formatLog.ts'

describe('formatDuration', () => {
  it('affiche les durées courtes en millisecondes', () => {
    expect(formatDuration(227)).toBe('227 ms')
  })

  it('affiche les durées longues en secondes', () => {
    expect(formatDuration(1535)).toBe('1,54 s')
  })
})

describe('httpStatusTone', () => {
  it('classe le statut par famille', () => {
    expect(httpStatusTone(201)).toBe('ok')
    expect(httpStatusTone(404)).toBe('client')
    expect(httpStatusTone(503)).toBe('server')
  })
})
