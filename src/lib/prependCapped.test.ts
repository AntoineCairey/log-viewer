import { describe, expect, it } from 'vitest'
import { prependCapped, prependUniqueCapped } from './prependCapped.ts'

describe('prependCapped', () => {
  it('place le lot le plus récent devant', () => {
    expect(prependCapped([1, 2], [3, 4], 5)).toEqual([4, 3, 1, 2])
  })

  it('retire les plus anciens au-delà du plafond', () => {
    expect(prependCapped([1, 2, 3], [4, 5], 3)).toEqual([5, 4, 1])
  })
})

describe('prependUniqueCapped', () => {
  it('ignore les identifiants déjà présents', () => {
    const current = [{ id: 'a' }, { id: 'b' }]

    expect(
      prependUniqueCapped(current, [{ id: 'b' }, { id: 'c' }, { id: 'c' }], 10),
    ).toEqual([{ id: 'c' }, { id: 'a' }, { id: 'b' }])
  })

  it('conserve la même liste quand le lot est déjà connu', () => {
    const current = [{ id: 'a' }]

    expect(prependUniqueCapped(current, [{ id: 'a' }], 10)).toBe(current)
  })

  it('retire les plus anciens après dédoublonnage', () => {
    const current = [{ id: 'a' }, { id: 'b' }]

    expect(prependUniqueCapped(current, [{ id: 'b' }, { id: 'c' }], 2)).toEqual(
      [{ id: 'c' }, { id: 'a' }],
    )
  })
})
