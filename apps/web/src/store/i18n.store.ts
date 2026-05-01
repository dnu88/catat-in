import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppLanguage = 'id' | 'en'

interface I18nState {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: 'id',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'catat-in-language' },
  ),
)
