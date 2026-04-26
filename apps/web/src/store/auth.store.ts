import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@lib/supabase'
import type { User } from '@catat-in/shared/types'

const LOGIN_TIMEOUT_MS = 20_000

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  signInWithEmail: (email: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      signInWithEmail: async (email, password) => {
        set({ isLoading: true })
        try {
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    'Login ke server terlalu lama. Jika memakai Supabase cloud gratis, project bisa sedang cold start. Tunggu sebentar lalu coba lagi.',
                  ),
                ),
              LOGIN_TIMEOUT_MS,
            ),
          )
          const signIn = supabase.auth.signInWithPassword({ email, password })
          const { data, error } = (await Promise.race([signIn, timeout])) as Awaited<typeof signIn>
          if (error) throw error

          if (data.session) {
            try {
              await get().refreshUser()
            } catch {
              set((state) => ({ ...state, isAuthenticated: true }))
            }
          }

          return !!data.session
        } finally {
          set({ isLoading: false })
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true })
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          })
          if (error) throw error
        } finally {
          set({ isLoading: false })
        }
      },

      requestPasswordReset: async (email) => {
        set({ isLoading: true })
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          })
          if (error) throw error
        } finally {
          set({ isLoading: false })
        }
      },

      updatePassword: async (password) => {
        set({ isLoading: true })
        try {
          const { error } = await supabase.auth.updateUser({ password })
          if (error) throw error
        } finally {
          set({ isLoading: false })
        }
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false })
      },

      refreshUser: async () => {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          set({ user: null, isAuthenticated: false })
          return
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()

        if (profile) {
          set({ user: profile as User, isAuthenticated: true })
          return
        }

        set((state) => ({ ...state, isAuthenticated: true }))
      },
    }),
    {
      name: 'catat-in-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

supabase.auth.onAuthStateChange(async (event, session) => {
  const { refreshUser, setUser } = useAuthStore.getState()
  if (event === 'SIGNED_IN' && session) {
    await refreshUser()
  } else if (event === 'SIGNED_OUT') {
    setUser(null)
  }
})
