import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { ThemeProvider } from '../../src/theme/theme-context'
import { I18nProvider } from '../../src/i18n/i18n-context'
import DashboardScreen from './index'

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

  it('uses softened neon green usage without changing the primary token', async () => {
    const screen = renderDashboard()

    const cta = screen.getByTestId('home-budget-action')
    expect(cta.props.style).toEqual(expect.arrayContaining([
      expect.objectContaining({ backgroundColor: '#A3FF12' }),
    ]))

    const primaryBubble = screen.getByTestId('home-quick-action-manual')
    expect(JSON.stringify(primaryBubble.props.style)).toContain('rgba(163, 255, 18, 0.10)')
  })
})
