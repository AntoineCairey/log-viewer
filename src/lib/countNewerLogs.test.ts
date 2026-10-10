import { describe, expect, it } from 'vitest'
import { countNewerLogs } from './countNewerLogs.ts'

const logs = [{ id: 'd' }, { id: 'c' }, { id: 'b' }, { id: 'a' }]

describe('countNewerLogs', () => {
  it('compte les logs arrivés devant l’ancre', () => {
    expect(countNewerLogs(logs, 'b')).toBe(2)
  })

  it('vaut zéro sans ancre ou quand l’ancre est en tête', () => {
    expect(countNewerLogs(logs, null)).toBe(0)
    expect(countNewerLogs(logs, 'd')).toBe(0)
  })

  it('compte tout quand l’ancre a été retirée par le plafond', () => {
    expect(countNewerLogs(logs, 'z')).toBe(4)
  })
})
