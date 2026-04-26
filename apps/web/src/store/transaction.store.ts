import { create } from 'zustand'
import { api } from '@lib/api'
import type { Transaction, TransactionFormData, PaginatedResponse } from '@catat-in/shared/types'

interface TransactionFilters {
  type?: 'income' | 'expense'
  category?: string
  wallet_id?: string
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

interface TransactionState {
  transactions: Transaction[]
  total: number
  isLoading: boolean
  error: string | null
  filters: TransactionFilters

  // Actions
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>
  addTransaction: (data: TransactionFormData) => Promise<Transaction>
  updateTransaction: (id: string, data: Partial<TransactionFormData>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  setFilters: (filters: TransactionFilters) => void
  clearError: () => void
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  total: 0,
  isLoading: false,
  error: null,
  filters: { page: 1, per_page: 20 },

  fetchTransactions: async (filters) => {
    const activeFilters = { ...get().filters, ...filters }
    set({ isLoading: true, error: null, filters: activeFilters })
    try {
      const params = new URLSearchParams()
      Object.entries(activeFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.append(k, String(v))
      })
      const { data } = await api.get<PaginatedResponse<Transaction>>(
        `/transactions/?${params.toString()}`
      )
      set({ transactions: data.data, total: data.total })
    } catch (err: any) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  addTransaction: async (formData) => {
    const { data } = await api.post<{ data: Transaction }>('/transactions/', formData)
    set((state) => ({
      transactions: [data.data, ...state.transactions],
      total: state.total + 1,
    }))
    return data.data
  },

  updateTransaction: async (id, formData) => {
    const { data } = await api.patch<{ data: Transaction }>(`/transactions/${id}`, formData)
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? data.data : t)),
    }))
  },

  deleteTransaction: async (id) => {
    await api.delete(`/transactions/${id}`)
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
      total: state.total - 1,
    }))
  },

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  clearError: () => set({ error: null }),
}))
