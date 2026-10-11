import { describe, expect, it } from 'vitest'
import { logsAtPause } from './logsAtPause.ts'

const logs = [{ id: 'd' }, { id: 'c' }, { id: 'b' }, { id: 'a' }]

describe('logsAtPause', () => {
  it('renvoie le flux entier hors pause', () => {
    expect(logsAtPause(logs, false, 'b')).toBe(logs)
  })

  it('garde le repère et les logs plus anciens', () => {
    expect(logsAtPause(logs, true, 'b')).toEqual([{ id: 'b' }, { id: 'a' }])
  })

  it('conserve la même liste quand le repère est déjà en tête', () => {
    expect(logsAtPause(logs, true, 'd')).toBe(logs)
  })

  it('vide le graphique sans repère ou quand il a été évincé', () => {
    expect(logsAtPause(logs, true, null)).toEqual([])
    expect(logsAtPause(logs, true, 'z')).toEqual([])
  })
})
