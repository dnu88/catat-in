import React from 'react'
import { render, screen, waitFor } from '@testing-library/react-native'

import BudgetsScreen from '../app/(tabs)/budgets'
import { ThemeProvider } from '../src/theme/theme-context'

jest.mock('../src/services/budget-envelopes', () => ({
  listBudgetEnvelopes: jest.fn(async () => [
    {
      id: 'env-kopi',
      user_id: 'user-1',
      name: 'Kopi',
      parent_category_id: 'cat-food',
      parent_category_name: 'Makan & Minum',
      limit_amount: 250000,
      start_date: '2026-05-10',
      end_date: '2026-05-25',
      icon: 'coffee',
      color: '#4A80F0',
      notes: 'Kopi Kenangan, Fore',
      status: 'active',
      created_at: '',
      updated_at: '',
    },
    {
      id: 'env-old',
      user_id: 'user-1',
      name: 'Ramadan',
      parent_category_id: 'cat-food',
      parent_category_name: 'Makan & Minum',
      limit_amount: 500000,
      start_date: '2026-03-01',
      end_date: '2026-03-30',
      icon: 'moon',
      color: '#A3FF12',
      notes: null,
      status: 'archived',
      created_at: '',
      updated_at: '',
    },
  ]),
  listEnvelopeAllocations: jest.fn(async () => [
    {
      id: 'a1',
      transaction_id: 'tx-1',
      envelope_id: 'env-kopi',
      amount: 220000,
      confidence: 0.92,
      needs_review: false,
      transaction_date: '2026-05-15',
      transaction_description: 'Kopi Kenangan',
      created_at: '',
      updated_at: '',
    },
    {
      id: 'a2',
      transaction_id: 'tx-2',
      envelope_id: 'env-kopi',
      amount: 48000,
      confidence: 0.62,
      needs_review: true,
      transaction_date: '2026-05-16',
      transaction_description: 'Cafe dekat kampus',
      created_at: '',
      updated_at: '',
    },
  ]),
  buildEnvelopeProgress: jest.requireActual('../src/services/budget-envelopes').buildEnvelopeProgress,
  getEnvelopeStatus: jest.requireActual('../src/services/budget-envelopes').getEnvelopeStatus,
}))

jest.mock('../src/components/ui', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => {
    const { Text, View } = require('react-native')
    return <View><Text>{title}</Text><Text>{description}</Text></View>
  },
  IconBubble: ({ name, tone, size }: { name: string; tone: string; size: number }) => {
    const { Text } = require('react-native')
    return <Text>{`${name}-${tone}-${size}`}</Text>
  },
  ScreenHeader: ({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) => {
    const { Text, View } = require('react-native')
    return <View><Text>{title}</Text><Text>{subtitle}</Text>{action}</View>
  },
  StateMessage: ({ message }: { message: string }) => {
    const { Text } = require('react-native')
    return <Text>{message}</Text>
  },
}))

jest.mock('../src/lib/supabase', () => ({
  useSupabase: () => ({
    supabase: {
      auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
    },
  }),
}))

function renderScreen() {
  return render(
    <ThemeProvider>
      <BudgetsScreen />
    </ThemeProvider>,
  )
}

describe('Budget envelopes screen', () => {
  it('shows active, review, and archive envelope sections', async () => {
    renderScreen()

    await waitFor(() => expect(screen.getByText('Amplop Aktif')).toBeTruthy())
    expect(screen.getByText('Kopi')).toBeTruthy()
    expect(screen.getByText('Perlu cek')).toBeTruthy()
    expect(screen.getByText('Cafe dekat kampus')).toBeTruthy()
    expect(screen.getByText('Arsip')).toBeTruthy()
    expect(screen.getByText('Ramadan')).toBeTruthy()
  })
})
