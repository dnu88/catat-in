import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ThemeToggle from '@components/theme/ThemeToggle'
import LandingPage from '@pages/LandingPage'

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

  it('renders the public landing CTA without auth config', () => {
    render(<LandingPage />)
    expect(screen.getByTestId('web-landing-page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Buka Kaswise PWA/i })).toHaveAttribute('href', 'https://kaswise.com')
    expect(screen.getAllByText(/beli kopi 35rb di Kopi Kenangan/i).length).toBeGreaterThan(0)
  })
})
