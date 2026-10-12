import { describe, expect, it } from 'vitest'
import { countPendingLogs } from './countPendingLogs.ts'

const logs = [{ id: 'e' }, { id: 'd' }, { id: 'c' }, { id: 'b' }, { id: 'a' }]

describe('countPendingLogs', () => {
  it('compte les logs filtrés arrivés après le repère', () => {
    const matched = [{ id: 'e' }, { id: 'c' }, { id: 'a' }]
    expect(countPendingLogs(matched, logs, 'c')).toBe(1)
  })

  it('ignore un log plus récent qui ne passe pas le filtre', () => {
    const matched = [{ id: 'd' }, { id: 'c' }]
    expect(countPendingLogs(matched, logs, 'd')).toBe(0)
  })

  it('compte quand le repère lui-même est filtré', () => {
    const matched = [{ id: 'e' }, { id: 'b' }]
    expect(countPendingLogs(matched, logs, 'd')).toBe(1)
  })

  it('vaut zéro quand le repère est déjà en tête', () => {
    expect(countPendingLogs(logs, logs, 'e')).toBe(0)
  })

  it('compte tout sans repère ou quand le plafond l’a évincé', () => {
    const matched = [{ id: 'b' }, { id: 'a' }]
    expect(countPendingLogs(matched, logs, null)).toBe(2)
    expect(countPendingLogs(matched, logs, 'z')).toBe(2)
  })
})
