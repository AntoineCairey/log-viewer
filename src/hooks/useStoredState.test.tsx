import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useStoredState } from './useStoredState.ts'

const KEY = 'log-viewer.test'

afterEach(() => {
  localStorage.clear()
})

describe('useStoredState', () => {
  it('relit une valeur déjà enregistrée et réécrit les changements', () => {
    localStorage.setItem(KEY, JSON.stringify({ n: 2 }))

    const read = () => {
      const raw = localStorage.getItem(KEY)
      return raw === null ? { n: 0 } : (JSON.parse(raw) as { n: number })
    }
    const write = (value: { n: number }) => {
      localStorage.setItem(KEY, JSON.stringify(value))
    }

    const { result } = renderHook(() => useStoredState(read, write))
    expect(result.current[0]).toEqual({ n: 2 })

    act(() => {
      result.current[1]({ n: 4 })
    })

    expect(result.current[0]).toEqual({ n: 4 })
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ n: 4 }))
  })
})
