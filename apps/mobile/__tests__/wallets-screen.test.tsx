import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import WalletsScreen from '../app/(tabs)/wallets'
import { ThemeProvider } from '../src/theme/theme-context'

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

function renderWallets() {
  return render(
    <ThemeProvider>
      <WalletsScreen />
    </ThemeProvider>,
  )
}

describe('WalletsScreen design system parity', () => {
  it('uses the same card-based hero treatment as Home instead of a solid neon hero', () => {
    const screen = renderWallets()

    const hero = screen.getByTestId('wallets-total-hero')
    const heroStyle = getFlattenedStyle(hero)

    expect(heroStyle.backgroundColor).not.toBe('#A3FF12')
    expect(heroStyle.borderRadius).toBe(24)
    expect(heroStyle.padding).toBe(18)
    expect(heroStyle.borderWidth).toBe(1)
    expect([
      'rgba(255, 255, 255, 0.06)',
      'rgba(10, 10, 10, 0.06)',
    ]).toContain(heroStyle.borderColor)
  })
})
