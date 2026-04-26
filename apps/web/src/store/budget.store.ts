import { create } from 'zustand'
import { api } from '@lib/api'
import type { Budget, BudgetFormData } from '@catat-in/shared/types'

interface BudgetWithSpent extends Budget {
  spent_amount: number
}

interface BudgetState {
  budgets: BudgetWithSpent[]
  isLoading: boolean
  error: string | null

  fetchBudgets: (periodStart?: string) => Promise<void>
  addBudget: (data: BudgetFormData) => Promise<void>
  updateBudget: (id: string, data: Partial<BudgetFormData>) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  clearError: () => void
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  isLoading: false,
  error: null,

  fetchBudgets: async (periodStart) => {
    set({ isLoading: true, error: null })
    try {
      const params = periodStart ? `?period_start=${periodStart}` : ''
      const { data } = await api.get<{ data: BudgetWithSpent[] }>(`/budgets/${params}`)
      set({ budgets: data.data })
    } catch (err: any) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  addBudget: async (formData) => {
    const { data } = await api.post<{ data: BudgetWithSpent }>('/budgets/', formData)
    set((state) => ({ budgets: [...state.budgets, data.data] }))
  },

  updateBudget: async (id, formData) => {
    const { data } = await api.patch<{ data: BudgetWithSpent }>(`/budgets/${id}`, formData)
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === id ? data.data : b)),
    }))
  },

  deleteBudget: async (id) => {
    await api.delete(`/budgets/${id}`)
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }))
  },

  clearError: () => set({ error: null }),
}))
