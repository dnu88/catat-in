import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeAll } from 'vitest'
import ThemeToggle from '@components/theme/ThemeToggle'
import LandingPage from '@pages/LandingPage'
import LegalInfoPage from '@pages/LegalInfoPage'

beforeAll(() => {
  class MockIntersectionObserver {
    observe() {}
    disconnect() {}
    unobserve() {}
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  })
})

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
    expect(screen.getAllByRole('link', { name: /Buka Kaswise PWA/i })[0]).toHaveAttribute('href', 'https://kaswise.com')
    expect(screen.getAllByText(/beli kopi 35rb di Kopi Kenangan/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Uang sering bocor bukan karena besar/i)).toBeInTheDocument()
    expect(screen.getByText(/Laporan mengikuti realita cashflow/i)).toBeInTheDocument()
    expect(screen.getByText(/Apa beda Total saldo dan Sisa periode ini/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /kaswise.id@gmail.com/i })).toHaveAttribute('href', 'mailto:kaswise.id@gmail.com')
  })

  it('renders static legal and help content with the approved support email', () => {
    render(<LegalInfoPage page="privacy" />)
    expect(screen.getByTestId('legal-page-privacy')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Kebijakan Privasi Kaswise/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tanya privasi/i })).toHaveAttribute(
      'href',
      'mailto:kaswise.id@gmail.com?subject=Kebijakan%20Privasi%20Kaswise',
    )
  })

  it('renders a public account deletion page with the approved support email path', () => {
    render(<LegalInfoPage page="accountDeletion" />)
    expect(screen.getByTestId('legal-page-accountDeletion')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Penghapusan Akun Kaswise/i })).toBeInTheDocument()
    expect(screen.getByText(/Settings aplikasi/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Email penghapusan akun/i })).toHaveAttribute(
      'href',
      'mailto:kaswise.id@gmail.com?subject=Permintaan%20Penghapusan%20Akun%20Kaswise',
    )
  })
})
