import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import ReportsScreen from '../app/(tabs)/reports'
import { ThemeProvider } from '../src/theme/theme-context'
import { SupabaseProvider } from '../src/lib/supabase'
import { I18nProvider } from '../src/i18n/i18n-context'

const mockTransactions = [
  { amount: 500000, transaction_type: 'expense', category: 'Makan', date: '2026-05-01' },
  { amount: 350000, transaction_type: 'expense', category: 'Belanja', date: '2026-05-02' },
  { amount: 200000, transaction_type: 'expense', category: 'Transport', date: '2026-05-03' },
  { amount: 150000, transaction_type: 'expense', category: 'Kesehatan', date: '2026-05-04' },
]

jest.mock('../src/lib/supabase', () => {
  const actual = jest.requireActual('../src/lib/supabase')
  const chain: {
    select: jest.Mock
    eq: jest.Mock
    gte: jest.Mock
    lte: jest.Mock
  } = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lte: jest.fn(async () => ({ data: mockTransactions, error: null })),
  }

  return {
    ...actual,
    useSupabase: () => ({
      supabase: {
        auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
        from: jest.fn(() => chain),
      },
    }),
    SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

jest.mock('../src/components/ui', () => ({
  IconBubble: ({ name, tone, size }: { name: string; tone: string; size: number }) => {
    const { Text } = require('react-native')
    return <Text>{`${name}-${tone}-${size}`}</Text>
  },
}))

jest.mock('react-native/Libraries/Share/Share', () => ({
  default: {
    share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
  },
  share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
}))

type StyleHostNode = {
  props: {
    style?: StyleProp<ViewStyle> | ((state: { pressed: boolean; hovered: boolean; focused: boolean }) => StyleProp<ViewStyle>)
  }
}

function getFlattenedStyle(node: StyleHostNode): ViewStyle {
  const style = typeof node.props.style === 'function'
    ? node.props.style({ pressed: false, hovered: false, focused: false })
    : node.props.style

  return StyleSheet.flatten(style) ?? {}
}

function renderReports() {
  return render(
    <SupabaseProvider>
      <I18nProvider>
        <ThemeProvider>
          <ReportsScreen />
        </ThemeProvider>
      </I18nProvider>
    </SupabaseProvider>,
  )
}

describe('ReportsScreen visual parity', () => {
  it('uses softened light-theme green accents instead of solid neon for non-primary controls', () => {
    const screen = renderReports()

    const monthBadge = screen.getByTestId('reports-month-badge')
    const monthBadgeStyle = getFlattenedStyle(monthBadge)
    expect(monthBadgeStyle.backgroundColor).not.toBe('#A3FF12')

    fireEvent.press(screen.getByText('1 Bulan'))
    const activePeriodText = screen.getByText('1 Bulan')
    expect((getFlattenedStyle(activePeriodText) as { color?: string }).color).not.toBe('#A3FF12')
  })

  it('maps recorded category names to donut colors instead of falling back to a static neon palette', async () => {
    const screen = renderReports()

    fireEvent.press(screen.getByText('Kategori'))

    const foodFill = await screen.findByTestId('reports-category-fill-makan')
    const shoppingFill = await screen.findByTestId('reports-category-fill-belanja')
    const transportFill = await screen.findByTestId('reports-category-fill-transport')
    const customFill = await screen.findByTestId('reports-category-fill-kesehatan')
    const foodSegment = await screen.findByTestId('reports-donut-segment-makan')
    const shoppingSegment = await screen.findByTestId('reports-donut-segment-belanja')
    const transportSegment = await screen.findByTestId('reports-donut-segment-transport')
    const customSegment = await screen.findByTestId('reports-donut-segment-kesehatan')

    expect(getFlattenedStyle(foodFill).backgroundColor).toBe('#65A30D')
    expect(getFlattenedStyle(shoppingFill).backgroundColor).toBe('#B45309')
    expect(getFlattenedStyle(transportFill).backgroundColor).toBe('#2A5DD0')
    expect(getFlattenedStyle(customFill).backgroundColor).toMatch(/^#[0-9A-F]{6}$/)
    expect(getFlattenedStyle(customFill).backgroundColor).not.toBe('#A3FF12')
    expect(foodSegment.props.accessibilityLabel).toBe(getFlattenedStyle(foodFill).backgroundColor)
    expect(shoppingSegment.props.accessibilityLabel).toBe(getFlattenedStyle(shoppingFill).backgroundColor)
    expect(transportSegment.props.accessibilityLabel).toBe(getFlattenedStyle(transportFill).backgroundColor)
    expect(customSegment.props.accessibilityLabel).toBe(getFlattenedStyle(customFill).backgroundColor)
    expect(getFlattenedStyle(foodFill).backgroundColor).not.toBe('#A3FF12')
  })

  it('renders the six month trend with continuous svg line paths and six months of visible points', () => {
    const screen = renderReports()

    expect(screen.getByTestId('reports-line-path-income').props.accessibilityLabel.split(' ')).toHaveLength(6)
    expect(screen.getByTestId('reports-line-path-expense').props.accessibilityLabel.split(' ')).toHaveLength(6)
    expect(screen.getAllByTestId(/reports-line-dot-income-/)).toHaveLength(6)
    expect(screen.getAllByTestId(/reports-line-dot-expense-/)).toHaveLength(6)
    expect(screen.queryByTestId('reports-bar-chart')).toBeNull()
  })
})
