import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import ReportsScreen from '../app/(tabs)/reports'
import { ThemeProvider } from '../src/theme/theme-context'
import { SupabaseProvider } from '../src/lib/supabase'
import { I18nProvider } from '../src/i18n/i18n-context'

const mockTransactions = [
  { amount: 500000, transaction_type: 'expense', category: 'Makan', date: '2026-05-01', description: 'Nasi padang', merchant: 'RM Sederhana', note: null },
  { amount: 350000, transaction_type: 'expense', category: 'Belanja', date: '2026-05-02', description: 'Groceries', merchant: 'Supermarket', note: null },
  { amount: 200000, transaction_type: 'expense', category: 'Transport', date: '2026-05-03', description: 'Taxi', merchant: 'Grab', note: null },
  { amount: 150000, transaction_type: 'expense', category: 'Kesehatan', date: '2026-05-04', description: 'Vitamin', merchant: 'Apotek', note: null },
]

jest.mock('../src/lib/supabase', () => {
  const gteMock = jest.fn(() => chain)
  const lteMock = jest.fn(async () => ({ data: mockTransactions, error: null }))
  ;(globalThis as any).__reportsGteMock = gteMock
  ;(globalThis as any).__reportsLteMock = lteMock

  const chain: {
    select: jest.Mock
    eq: jest.Mock
    gte: jest.Mock
    lte: jest.Mock
  } = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    gte: gteMock,
    lte: lteMock,
  }

  return {
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

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
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
  it('exposes envelope management entry point in Reports', async () => {
    renderReports()

    await waitFor(() => expect(screen.getByText(/Amplop/i)).toBeTruthy())
    expect(screen.getByText('Kelola')).toBeTruthy()
  })

  it('uses softened light-theme green accents instead of solid neon for non-primary controls', () => {
    const screen = renderReports()

    const monthBadge = screen.getByTestId('reports-month-badge')
    const monthBadgeStyle = getFlattenedStyle(monthBadge)
    expect(monthBadgeStyle.backgroundColor).not.toBe('#A3FF12')

    fireEvent.press(screen.getByText('1 Bulan'))
    const activePeriodText = screen.getByText('1 Bulan')
    expect((getFlattenedStyle(activePeriodText) as { color?: string }).color).not.toBe('#A3FF12')
  })

  it('matches home hero light-theme treatment for reports summary accents', () => {
    const screen = renderReports()

    const summaryCard = screen.getByTestId('reports-summary-card')
    const incomeValue = screen.getByTestId('reports-summary-income-value')
    const expenseValue = screen.getByTestId('reports-summary-expense-value')
    const savingsValue = screen.getByTestId('reports-summary-savings-value')

    const summaryCardStyle = getFlattenedStyle(summaryCard)
    const incomeStyle = getFlattenedStyle(incomeValue) as { color?: string }
    const expenseStyle = getFlattenedStyle(expenseValue) as { color?: string }
    const savingsStyle = getFlattenedStyle(savingsValue) as { color?: string }

    expect(summaryCardStyle.backgroundColor).toBe('#FFFFFF')
    expect(summaryCardStyle.borderColor).toBe('rgba(10, 10, 10, 0.06)')
    expect(incomeStyle.color).toBe('#65A30D')
    expect(expenseStyle.color).not.toBe('#FF7B7B')
    expect(savingsStyle.color).toBe('#0A0A0A')
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

  it('opens a category transaction detail panel and closes it with the back button', async () => {
    const screen = renderReports()

    fireEvent.press(screen.getByText('Kategori'))
    fireEvent.press(await screen.findByTestId('reports-category-row-makan'))

    expect(await screen.findByTestId('reports-category-detail-modal')).toBeTruthy()
    expect(screen.getAllByText('Makan').length).toBeGreaterThan(0)
    expect(screen.getByText('Nasi padang')).toBeTruthy()
    expect(screen.getByText('RM Sederhana')).toBeTruthy()
    expect(screen.getAllByText('Rp 500.000').length).toBeGreaterThan(0)

    fireEvent.press(screen.getByTestId('reports-category-detail-back'))
    await waitFor(() => expect(screen.queryByTestId('reports-category-detail-modal')).toBeNull())
  })

  it('renders refined editorial donut segments without changing category colors', async () => {
    const screen = renderReports()

    fireEvent.press(screen.getByText('Kategori'))

    const foodFill = await screen.findByTestId('reports-category-fill-makan')
    const foodSegment = await screen.findByTestId('reports-donut-segment-makan')
    const foodGlow = await screen.findByTestId('reports-donut-glow-makan')

    expect(foodSegment.props.strokeLinecap).toBe(0)
    expect(foodSegment.props.strokeWidth).toBeGreaterThanOrEqual(17)
    expect(foodSegment.props.strokeWidth).toBeLessThanOrEqual(19)
    expect(foodSegment.props.strokeDasharray).toHaveLength(2)
    const foodCircumference = 2 * Math.PI * Number(foodSegment.props.r)
    const foodRawDash = (500000 / (500000 + 350000 + 200000 + 150000)) * foodCircumference
    expect(Math.abs((Number(foodSegment.props.strokeDasharray[0]) + 6) - foodRawDash)).toBeLessThan(0.001)
    expect(foodGlow.props.accessibilityLabel).toBe(getFlattenedStyle(foodFill).backgroundColor)
    expect(foodGlow.props.opacity).toBeLessThan(0.4)
    expect(foodSegment.props.accessibilityLabel).toBe(getFlattenedStyle(foodFill).backgroundColor)
  })

  it('uses precise amount-based donut proportions instead of rounded display percentages', async () => {
    const screen = renderReports()

    fireEvent.press(screen.getByText('Kategori'))

    const foodSegment = await screen.findByTestId('reports-donut-segment-makan')
    const shoppingSegment = await screen.findByTestId('reports-donut-segment-belanja')
    const circumference = 2 * Math.PI * Number(foodSegment.props.r)
    const total = 500000 + 350000 + 200000 + 150000

    expect(Math.abs((Number(foodSegment.props.strokeDasharray[0]) + 6) - ((500000 / total) * circumference))).toBeLessThan(0.001)
    expect(Math.abs((Number(shoppingSegment.props.strokeDasharray[0]) + 6) - ((350000 / total) * circumference))).toBeLessThan(0.001)
  })

  it('uses a different donut color for every rendered expense category', async () => {
    const screen = renderReports()

    fireEvent.press(screen.getByText('Kategori'))

    const segments = await Promise.all([
      screen.findByTestId('reports-donut-segment-makan'),
      screen.findByTestId('reports-donut-segment-belanja'),
      screen.findByTestId('reports-donut-segment-transport'),
      screen.findByTestId('reports-donut-segment-kesehatan'),
    ])
    const colors = segments.map((segment: { props: { accessibilityLabel: string } }) => segment.props.accessibilityLabel)

    expect(new Set(colors).size).toBe(colors.length)
  })

  it('keeps the premium donut ring centered with enough SVG breathing room for glow caps', async () => {
    const screen = renderReports()

    fireEvent.press(screen.getByText('Kategori'))

    const donutSvg = await screen.findByTestId('reports-donut-svg')
    const foodGlow = await screen.findByTestId('reports-donut-glow-makan')
    const center = Number(foodGlow.props.cx)
    const outerEdge = Number(foodGlow.props.r) + Number(foodGlow.props.strokeWidth) / 2

    expect(Number(donutSvg.props.width)).toBeGreaterThanOrEqual(170)
    expect(center - outerEdge).toBeGreaterThanOrEqual(8)
    expect(foodGlow.props.cy).toBe(foodGlow.props.cx)
  })

  it('lets custom period choose exact start and end dates for the Supabase query', async () => {
    const screen = renderReports()

    fireEvent.press(screen.getByText('Kustom'))
    fireEvent.press(await screen.findByTestId('reports-start-day-15'))
    fireEvent.press(await screen.findByTestId('reports-end-day-20'))
    fireEvent.press(screen.getByText('Terapkan'))

    await waitFor(() => {
      expect((globalThis as any).__reportsGteMock).toHaveBeenLastCalledWith('date', expect.stringMatching(/-15$/))
      expect((globalThis as any).__reportsLteMock).toHaveBeenLastCalledWith('date', expect.stringMatching(/-20$/))
    })
  })
})
