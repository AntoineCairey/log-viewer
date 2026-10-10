import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('toolchain', () => {
  it('rend un élément avec Testing Library et jest-dom', () => {
    render(<p>prêt</p>)

    expect(screen.getByText('prêt')).toBeInTheDocument()
  })
})
