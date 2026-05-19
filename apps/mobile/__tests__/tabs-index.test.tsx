import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { StyleSheet, Text } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { ThemeProvider } from '../src/theme/theme-context'
import { I18nProvider } from '../src/i18n/i18n-context'
import DashboardScreen from '../app/(tabs)/index'

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function renderDashboard() {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <DashboardScreen />
      </I18nProvider>
    </ThemeProvider>,
  )
}

function getTextContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(getTextContent).join('')
  }

  if (value && typeof value === 'object' && 'props' in value) {
    return getTextContent((value as { props?: { children?: unknown } }).props?.children)
  }

  return ''
}

function getRenderedTextNodes(screen: ReturnType<typeof renderDashboard>) {
  return screen.UNSAFE_getAllByType(Text)
    .map((node) => getTextContent(node.props.children).trim())
    .filter(Boolean)
}

function expectTextOrder(texts: string[], expectedTexts: string[]) {
  let lastIndex = -1

  expectedTexts.forEach((label) => {
    const index = texts.findIndex((text, textIndex) => textIndex > lastIndex && text === label)

    expect(index).not.toBe(-1)
    expect(index).toBeGreaterThan(lastIndex)
    lastIndex = index
  })
}

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

const SOFT_GREEN_BACKGROUNDS = [
  'rgba(163, 255, 18, 0.08)',
  'rgba(163, 255, 18, 0.09)',
  'rgba(163, 255, 18, 0.10)',
  'rgba(163, 255, 18, 0.11)',
  'rgba(163, 255, 18, 0.12)',
  'rgba(163, 255, 18, 0.13)',
  'rgba(163, 255, 18, 0.14)',
]

const SOFT_GREEN_BORDERS = [
  'rgba(163, 255, 18, 0.18)',
  'rgba(163, 255, 18, 0.19)',
  'rgba(163, 255, 18, 0.20)',
  'rgba(163, 255, 18, 0.21)',
  'rgba(163, 255, 18, 0.22)',
  'rgba(163, 255, 18, 0.23)',
  'rgba(163, 255, 18, 0.24)',
  'rgba(163, 255, 18, 0.25)',
]

describe('DashboardScreen dark luxury Home parity', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders the Screens.jsx Home section order and labels', async () => {
    const screen = renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Halo, Danu')).toBeTruthy()
    })

    expect(screen.getByText('April 2026')).toBeTruthy()
    expect(screen.getByText('DB')).toBeTruthy()

    expect(screen.getByText('Total saldo')).toBeTruthy()
    expect(screen.getByText('Rp 4.250.000')).toBeTruthy()
    expect(screen.getByText('Main Wallet')).toBeTruthy()
    expect(screen.getByText('Manage')).toBeTruthy()
    expect(screen.getByText('↗ 15%')).toBeTruthy()
    expect(screen.getByText('Pemasukan')).toBeTruthy()
    expect(screen.getByText('8,00 Jt')).toBeTruthy()
    expect(screen.getByText('Pengeluaran')).toBeTruthy()
    expect(screen.getByText('3,75 Jt')).toBeTruthy()
    expect(screen.getByText('Tabungan')).toBeTruthy()
    expect(screen.getByText('53%')).toBeTruthy()

    expect(screen.getByText('Manual')).toBeTruthy()
    expect(screen.getByText('AI Chat')).toBeTruthy()
    expect(screen.getByText('Struk')).toBeTruthy()
    expect(screen.getByText('Import')).toBeTruthy()

    expect(screen.getByText('Anggaran')).toBeTruthy()
    expect(screen.getByText('Lihat →')).toBeTruthy()
    expect(screen.getByText('Makan')).toBeTruthy()
    expect(screen.getByText('77%')).toBeTruthy()
    expect(screen.getByText('620rb / 800rb')).toBeTruthy()
    expect(screen.getByText('Sisa 180rb · Hampir habis')).toBeTruthy()

    expect(screen.getByText('Terakhir')).toBeTruthy()
    expect(screen.getByText('Semua →')).toBeTruthy()
    expect(screen.getByText('Indomaret')).toBeTruthy()
    expect(screen.getByText('Fore Coffee')).toBeTruthy()
    expect(screen.getByText('Grab Car')).toBeTruthy()

    expect(screen.getByText('Insight harian')).toBeTruthy()
    expect(screen.getByText(/Pengeluaran kategori/)).toBeTruthy()

    expectTextOrder(getRenderedTextNodes(screen), [
      'Halo, Danu',
      'April 2026',
      'Total saldo',
      'Rp 4.250.000',
      'Manual',
      'AI Chat',
      'Struk',
      'Import',
      'Anggaran',
      'Terakhir',
      'Insight harian',
    ])
  })

  it('routes primary Home actions to the expected tabs', async () => {
    const screen = renderDashboard()

    fireEvent.press(screen.getByText('Manual'))
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/capture')

    fireEvent.press(screen.getByText('Import'))
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/imports')

    fireEvent.press(screen.getByText('Lihat →'))
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/budgets')

    fireEvent.press(screen.getByText('Semua →'))
    expect(mockPush).toHaveBeenLastCalledWith('/(tabs)/transactions')
  })

  it('uses Bottom Tab and FAB green for light theme primary accents', async () => {
    const screen = renderDashboard()

    const avatar = screen.getByTestId('home-avatar')
    const avatarStyle = getFlattenedStyle(avatar)
    expect(avatarStyle.width).toBe(36)
    expect(avatarStyle.height).toBe(36)
    expect(avatarStyle.backgroundColor).toBe('#65A30D')

    const hero = screen.getByTestId('home-hero-card')
    const heroStyle = getFlattenedStyle(hero)
    expect(heroStyle.borderRadius).toBe(24)
    expect(heroStyle.padding).toBe(18)
    expect(heroStyle.shadowOpacity).toBeUndefined()

    const walletPill = screen.getByTestId('home-wallet-pill')
    const walletPillStyle = getFlattenedStyle(walletPill)
    expect(walletPillStyle.borderRadius).toBe(999)
    expect(walletPillStyle.paddingVertical).toBe(7)
    expect(walletPillStyle.paddingHorizontal).toBe(12)

    const quickAction = screen.getByTestId('home-quick-action-manual')
    const quickActionStyle = getFlattenedStyle(quickAction)
    expect(quickActionStyle.borderRadius).toBe(16)
    expect(quickActionStyle.paddingVertical).toBe(12)
    expect(quickActionStyle.paddingHorizontal).toBe(8)

    const sectionCard = screen.getByTestId('home-budget-section')
    const sectionCardStyle = getFlattenedStyle(sectionCard)
    expect(sectionCardStyle.borderRadius).toBe(18)
    expect(sectionCardStyle.padding).toBe(14)

    const cta = screen.getByTestId('home-budget-action')
    expect(getFlattenedStyle(cta).backgroundColor).toBeUndefined()

    const primaryBubble = screen.getByTestId('home-quick-bubble-manual')
    const primaryBubbleStyle = getFlattenedStyle(primaryBubble)
    expect(primaryBubbleStyle.width).toBe(32)
    expect(primaryBubbleStyle.height).toBe(32)
    expect(
      SOFT_GREEN_BACKGROUNDS.includes(primaryBubbleStyle.backgroundColor as string)
        || SOFT_GREEN_BORDERS.includes(primaryBubbleStyle.borderColor as string),
    ).toBe(true)
  })
})
