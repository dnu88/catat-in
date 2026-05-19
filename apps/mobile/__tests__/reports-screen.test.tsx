import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import ReportsScreen from '../app/(tabs)/reports'
import { ThemeProvider } from '../src/theme/theme-context'
import { SupabaseProvider } from '../src/lib/supabase'

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
      <ThemeProvider>
        <ReportsScreen />
      </ThemeProvider>
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

  it('gives each expense category its own visual color', () => {
    const screen = renderReports()

    fireEvent.press(screen.getByText('Kategori'))

    const fillColors = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'other'].map((id) => {
      const fill = screen.getByTestId(`reports-category-fill-${id}`)
      return getFlattenedStyle(fill).backgroundColor
    })

    expect(new Set(fillColors).size).toBeGreaterThan(3)
    expect(fillColors.every((color) => color !== '#A3FF12')).toBe(true)
  })
})
