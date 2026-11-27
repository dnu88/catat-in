import { render } from '@testing-library/react-native'

import LoginScreen from '../app/(auth)/login'
import SettingsScreen from '../app/(tabs)/settings'
import { I18nProvider } from '../src/i18n/i18n-context'
import { SupabaseProvider } from '../src/lib/supabase'
import { ThemeProvider } from '../src/theme/theme-context'

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}))

jest.mock('../src/lib/supabase', () => {
  const actual = jest.requireActual('../src/lib/supabase')
  return {
    ...actual,
    useSupabase: () => ({
      supabase: {
        auth: {
          signInWithPassword: jest.fn(async () => ({ error: null })),
          signOut: jest.fn(async () => ({ error: null })),
          getUser: jest.fn(async () => ({ data: { user: null } })),
        },
      },
    }),
    SupabaseProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <SupabaseProvider>
      <I18nProvider>
        <ThemeProvider>{ui}</ThemeProvider>
      </I18nProvider>
    </SupabaseProvider>,
  )
}

describe('Kaswise brand logo placement', () => {
  it('renders the exact design-system Kaswise mark on the login screen', () => {
    const screen = renderWithProviders(<LoginScreen />)

    expect(screen.getByTestId('login-kaswise-logo-mark')).toBeTruthy()
    expect(screen.getByTestId('login-kaswise-logo-mark').props.accessibilityRole).toBe('image')
    for (const id of ['1', '2', '3', '4']) {
      const polygon = screen.getByTestId(`kaswise-logo-polygon-${id}`, { includeHiddenElements: true })
      expect(polygon.props.accessibilityLabel).toBeUndefined()
    }
  })

  it('keeps the operational settings screen free of decorative branding', () => {
    const screen = renderWithProviders(<SettingsScreen />)

    expect(screen.queryByTestId('settings-kaswise-logo-mark')).toBeNull()
  })
})
