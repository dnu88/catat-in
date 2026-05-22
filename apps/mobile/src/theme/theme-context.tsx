import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Appearance } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { toMobileTheme, type MobileTheme } from './mobile-theme'

export type ThemePreference = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  preference: ThemePreference
  theme: MobileTheme
  setPreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'kaswise:theme-preference'

function resolveMode(preference: ThemePreference, systemScheme: 'light' | 'dark'): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return systemScheme
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  )

  useEffect(() => {
    let active = true

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isThemePreference(stored)) {
          setPreferenceState(stored)
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light')
    })

    return () => subscription.remove()
  }, [])

  const mode = resolveMode(preference, systemScheme)
  const theme = useMemo(() => toMobileTheme(mode), [mode])

  const value = useMemo<ThemeContextValue>(() => {
    const setPreference = (next: ThemePreference) => {
      setPreferenceState(next)
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
    }

    return {
      preference,
      theme,
      setPreference,
      toggleTheme: () => setPreference(mode === 'dark' ? 'light' : 'dark'),
    }
  }, [mode, preference, theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
