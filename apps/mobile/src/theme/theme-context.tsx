import { createContext, useContext, useMemo, useState } from 'react'
import { Appearance } from 'react-native'
import { toMobileTheme, type MobileTheme } from './mobile-theme'

export type ThemePreference = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  preference: ThemePreference
  theme: MobileTheme
  setPreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveMode(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>('system')

  const mode = resolveMode(preference)
  const theme = useMemo(() => toMobileTheme(mode), [mode])

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      theme,
      setPreference,
      toggleTheme: () => setPreference(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode, preference, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
