import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  applyWebTheme,
  resolveThemeMode,
  type ThemePreference,
} from '../theme/web-theme'

type ThemeState = {
  preference: ThemePreference
  currentMode: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
  syncSystem: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      preference: 'dark',
      currentMode: 'dark',
      setPreference: (preference) => {
        const mode = resolveThemeMode(preference)
        applyWebTheme(mode)
        set({ preference, currentMode: mode })
      },
      syncSystem: () => {
        if (get().preference !== 'system') return
        const mode = resolveThemeMode('system')
        applyWebTheme(mode)
        set({ currentMode: mode })
      },
    }),
    {
      name: 'kaswise-web-theme',
      partialize: (state) => ({ preference: state.preference }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const mode = resolveThemeMode(state.preference)
        applyWebTheme(mode)
        state.currentMode = mode
      },
    },
  ),
)
