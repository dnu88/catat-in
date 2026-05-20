import React from 'react'
import { render, screen, waitFor } from '@testing-library/react-native'

import CaptureScreen from '../app/(tabs)/capture'
import { ThemeProvider } from '../src/theme/theme-context'

const mockCreateEnvelopeAllocation = jest.fn(async (..._args: any[]) => ({ id: 'alloc-1' }))
let mockEnvelopeSuggestion: null | {
  id?: string
  envelope_id?: string
  name: string
  amount?: number
  confidence?: number
  remaining_after_transaction?: number
  needs_review?: boolean
} = {
  envelope_id: 'env-kopi',
  name: 'Kopi',
  amount: 25_000,
  confidence: 0.9,
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

jest.mock('../src/services/budget-envelopes', () => ({
  createEnvelopeAllocation: (...args: any[]) => mockCreateEnvelopeAllocation.apply(null, args),
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
    mockCreateEnvelopeAllocation.mockClear()
    mockEnvelopeSuggestion = {
      envelope_id: 'env-kopi',
      name: 'Kopi',
      amount: 25_000,
      confidence: 0.9,
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
      envelope_id: 'env-kopi',
      name: 'Kopi',
      amount: 25_000,
      confidence: 0.62,
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

  it('persists an envelope allocation when suggestion has an envelope id', async () => {
    render(
      <ThemeProvider>
        <CaptureScreen />
      </ThemeProvider>,
    )

    await waitFor(() => expect(mockCreateEnvelopeAllocation).toHaveBeenCalledTimes(1))
    expect(mockCreateEnvelopeAllocation.mock.calls[0][1]).toEqual({
      transaction_id: 'tx-1',
      envelope_id: 'env-kopi',
      amount: 25000,
      confidence: 0.9,
      needs_review: false,
    })
  })

  it('is safe when the transaction has no envelope suggestion', async () => {
    mockEnvelopeSuggestion = null

    render(
      <ThemeProvider>
        <CaptureScreen />
      </ThemeProvider>,
    )

    expect(screen.getByText(/Transaksi tercatat/i)).toBeTruthy()
    expect(screen.queryByTestId('capture-envelope-suggestion')).toBeNull()
    await waitFor(() => expect(mockCreateEnvelopeAllocation).not.toHaveBeenCalled())
  })
})
