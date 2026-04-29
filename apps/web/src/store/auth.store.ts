import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
} from 'firebase/auth'
import type { User } from '@catat-in/shared/types'
import { auth, googleProvider, subscribeAuthState } from '@lib/firebase'
import { ensureUserProfileFromAuth, getUserProfile } from '@lib/firestore'

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
  confirmPasswordResetByCode: (oobCode: string, password: string) => Promise<void>
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
                  new Error('Koneksi ke Firebase lambat. Cek koneksi internet Anda atau coba lagi.'),
                ),
              LOGIN_TIMEOUT_MS,
            ),
          )

          const signIn = signInWithEmailAndPassword(auth, email, password)
          const { user } = (await Promise.race([signIn, timeout])) as Awaited<typeof signIn>
          await ensureUserProfileFromAuth(user)
          await get().refreshUser()
          return true
        } catch (err) {
          console.error('Login error:', err)
          throw err
        } finally {
          set({ isLoading: false })
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true })
        try {
          const result = await signInWithPopup(auth, googleProvider)
          await ensureUserProfileFromAuth(result.user)
          await get().refreshUser()
        } finally {
          set({ isLoading: false })
        }
      },

      requestPasswordReset: async (email) => {
        set({ isLoading: true })
        try {
          await sendPasswordResetEmail(auth, email, {
            url: `${window.location.origin}/reset-password`,
            handleCodeInApp: false,
          })
        } finally {
          set({ isLoading: false })
        }
      },

      updatePassword: async (password) => {
        set({ isLoading: true })
        try {
          if (!auth.currentUser) {
            throw new Error('Sesi login tidak ditemukan. Silakan login ulang.')
          }
          await firebaseUpdatePassword(auth.currentUser, password)
        } finally {
          set({ isLoading: false })
        }
      },

      confirmPasswordResetByCode: async (oobCode, password) => {
        set({ isLoading: true })
        try {
          await confirmPasswordReset(auth, oobCode, password)
        } finally {
          set({ isLoading: false })
        }
      },

      signOut: async () => {
        set({ isLoading: true })
        try {
          await firebaseSignOut(auth)
        } finally {
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      },

      refreshUser: async () => {
        const authUser = auth.currentUser
        if (!authUser) {
          set({ user: null, isAuthenticated: false })
          return
        }

        const profile = await getUserProfile(authUser.uid)
        if (profile) {
          set({ user: profile, isAuthenticated: true })
          return
        }

        const created = await ensureUserProfileFromAuth(authUser)
        set({ user: created, isAuthenticated: true })
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

subscribeAuthState(async (user) => {
  const { refreshUser, setUser } = useAuthStore.getState()
  if (user) {
    await refreshUser()
    return
  }
  setUser(null)
})
