import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

import LoginScreen from '../app/(auth)/login'
import { ThemeProvider } from '../src/theme/theme-context'
import { I18nProvider } from '../src/i18n/i18n-context'
import { SupabaseProvider } from '../src/lib/supabase'

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  Link: ({ children }: { children: React.ReactNode }) => children,
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

function renderLogin() {
  return render(
    <SupabaseProvider>
      <I18nProvider>
        <ThemeProvider>
          <LoginScreen />
        </ThemeProvider>
      </I18nProvider>
    </SupabaseProvider>,
  )
}

describe('light theme softened brand accents', () => {
  it('uses a deeper readable green for login primary CTA in light mode', () => {
    const screen = renderLogin()
    const button = screen.getByTestId('auth-primary-button')
    const buttonStyle = getFlattenedStyle(button)

    expect(buttonStyle.backgroundColor).toBe('#65A30D')
    expect(buttonStyle.backgroundColor).not.toBe('#A3FF12')
  })
})
