import { describe, expect, it } from 'vitest'
import { appendCapped } from './appendCapped.ts'

describe('appendCapped', () => {
  it('ajoute les éléments quand le plafond n’est pas atteint', () => {
    expect(appendCapped([1, 2], [3], 5)).toEqual([1, 2, 3])
  })

  it('retire les plus anciens au-delà du plafond', () => {
    expect(appendCapped([1, 2, 3], [4, 5], 3)).toEqual([3, 4, 5])
  })
})
