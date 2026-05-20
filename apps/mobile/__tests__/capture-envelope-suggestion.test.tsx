import React from 'react'
import { render, screen } from '@testing-library/react-native'

import CaptureScreen from '../app/(tabs)/capture'
import { ThemeProvider } from '../src/theme/theme-context'

let mockEnvelopeSuggestion: null | { name: string; remaining_after_transaction?: number; needs_review?: boolean } = {
  name: 'Kopi',
  remaining_after_transaction: 17_000,
  needs_review: false,
}

jest.mock('../src/hooks/useTransactionRealtime', () => ({
  useTransactionRealtime: () => ({
    loading: false,
    transaction: {
      id: 'tx-1',
      status: 'done',
      confidence: 0.9,
      category: 'Makan & Minum',
      description: 'Kopi Kenangan',
      envelope_suggestion: mockEnvelopeSuggestion,
    },
  }),
}))

jest.mock('../src/lib/supabase', () => ({
  useSupabase: () => ({
    supabase: {
      auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
      from: jest.fn(),
      functions: { invoke: jest.fn() },
    },
  }),
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('Capture envelope suggestion', () => {
  beforeEach(() => {
    mockEnvelopeSuggestion = {
      name: 'Kopi',
      remaining_after_transaction: 17_000,
      needs_review: false,
    }
  })

  it('shows suggested envelope without blocking save', () => {
    render(
      <ThemeProvider>
        <CaptureScreen />
      </ThemeProvider>,
    )

    expect(screen.getByText(/Amplop/i)).toBeTruthy()
    expect(screen.getByText(/Kopi/i)).toBeTruthy()
    expect(screen.getByText(/17\.000|Rp17\.000 tersisa/i)).toBeTruthy()
    expect(screen.getByText(/Langsung simpan/i)).toBeTruthy()
  })

  it('shows review copy inside the suggestion card for low-confidence matches', () => {
    mockEnvelopeSuggestion = {
      name: 'Kopi',
      remaining_after_transaction: 17_000,
      needs_review: true,
    }

    render(
      <ThemeProvider>
        <CaptureScreen />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('capture-envelope-suggestion')).toBeTruthy()
    expect(screen.getByText('Perlu cek di Reports')).toBeTruthy()
  })

  it('is safe when the transaction has no envelope suggestion', () => {
    mockEnvelopeSuggestion = null

    render(
      <ThemeProvider>
        <CaptureScreen />
      </ThemeProvider>,
    )

    expect(screen.getByText(/Transaksi tercatat/i)).toBeTruthy()
    expect(screen.queryByTestId('capture-envelope-suggestion')).toBeNull()
  })
})
