import { create } from 'zustand'
import { api } from '@lib/api'
import type { Wallet } from '@catat-in/shared/types'

export interface WalletFormData {
  name: string
  type: 'bank' | 'ewallet' | 'cash' | 'investment'
  balance: number
  bank_name?: string
  account_number?: string
}

interface WalletState {
  wallets: Wallet[]
  isLoading: boolean
  error: string | null

  fetchWallets: () => Promise<void>
  addWallet: (data: WalletFormData) => Promise<void>
  updateWallet: (id: string, data: Partial<WalletFormData>) => Promise<void>
  deleteWallet: (id: string) => Promise<void>
  totalBalance: () => number
  clearError: () => void
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  isLoading: false,
  error: null,

  fetchWallets: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.get<{ data: Wallet[] }>('/wallets/')
      set({ wallets: data.data })
    } catch (err: any) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  addWallet: async (formData) => {
    const { data } = await api.post<{ data: Wallet }>('/wallets/', formData)
    set((state) => ({ wallets: [...state.wallets, data.data] }))
  },

  updateWallet: async (id, formData) => {
    const { data } = await api.patch<{ data: Wallet }>(`/wallets/${id}`, formData)
    set((state) => ({
      wallets: state.wallets.map((w) => (w.id === id ? data.data : w)),
    }))
  },

  deleteWallet: async (id) => {
    await api.delete(`/wallets/${id}`)
    set((state) => ({ wallets: state.wallets.filter((w) => w.id !== id) }))
  },

  totalBalance: () => get().wallets.reduce((sum, w) => sum + Number(w.balance), 0),

  clearError: () => set({ error: null }),
}))
