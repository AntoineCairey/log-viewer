import { describe, expect, it } from 'vitest'
import { formatDuration, formatService, httpStatusTone } from './formatLog.ts'

describe('formatDuration', () => {
  it('affiche toujours les durées en millisecondes', () => {
    expect(formatDuration(227)).toBe('227 ms')
    expect(formatDuration(1535.4)).toBe('1\u202f535 ms')
  })
})

describe('formatService', () => {
  it('retire le suffixe -service', () => {
    expect(formatService('notification-service')).toBe('notification')
  })

  it('laisse les autres noms intacts', () => {
    expect(formatService('gateway')).toBe('gateway')
  })
})

describe('httpStatusTone', () => {
  it('classe le statut par famille', () => {
    expect(httpStatusTone(201)).toBe('ok')
    expect(httpStatusTone(404)).toBe('client')
    expect(httpStatusTone(503)).toBe('server')
  })
})
