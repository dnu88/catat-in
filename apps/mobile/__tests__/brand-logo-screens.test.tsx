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
    expect(screen.getByTestId('kaswise-logo-polygon-1').props.accessibilityLabel).toBe('15,35 35,85 50,85 30,35')
    expect(screen.getByTestId('kaswise-logo-polygon-2').props.accessibilityLabel).toBe('35,85 60,35 75,35 50,85')
    expect(screen.getByTestId('kaswise-logo-polygon-3').props.accessibilityLabel).toBe('60,35 75,85 90,85 75,35')
    expect(screen.getByTestId('kaswise-logo-polygon-4').props.accessibilityLabel).toBe('75,85 90,85 106,45 118,50 112,10 80,30 91,45')
  })

  it('renders the Kaswise mark in settings', () => {
    const screen = renderWithProviders(<SettingsScreen />)

    expect(screen.getByTestId('settings-kaswise-logo-mark')).toBeTruthy()
  })
})
