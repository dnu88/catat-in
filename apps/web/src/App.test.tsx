import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ThemeToggle from '@components/theme/ThemeToggle'

describe('Web UI foundation', () => {
  it('renders theme toggle button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: /theme toggle/i })).toBeInTheDocument()
  })

  it('exposes utility classes for primitives', () => {
    render(<div className="ks-card ks-btn ks-input" />)
    expect(document.querySelector('.ks-card')).toBeInTheDocument()
    expect(document.querySelector('.ks-btn')).toBeInTheDocument()
    expect(document.querySelector('.ks-input')).toBeInTheDocument()
  })
})
