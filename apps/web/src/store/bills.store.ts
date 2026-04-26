import { create } from 'zustand'
import { api } from '@lib/api'
import type { BillReminder, BillFormData } from '@catat-in/shared/types'

interface BillsState {
  bills: BillReminder[]
  isLoading: boolean
  error: string | null

  fetchBills: () => Promise<void>
  addBill: (data: BillFormData) => Promise<void>
  payBill: (id: string) => Promise<void>
  deleteBill: (id: string) => Promise<void>
  clearError: () => void
}

export const useBillsStore = create<BillsState>((set) => ({
  bills: [],
  isLoading: false,
  error: null,

  fetchBills: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.get<{ data: BillReminder[] }>('/bills/')
      set({ bills: data.data })
    } catch (err: any) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  addBill: async (formData) => {
    const { data } = await api.post<{ data: BillReminder }>('/bills/', formData)
    set((state) => ({
      bills: [...state.bills, data.data].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)),
    }))
  },

  payBill: async (id) => {
    const { data } = await api.post<{ data: BillReminder }>(`/bills/${id}/pay`)
    set((state) => ({
      bills: state.bills
        .map((b) => (b.id === id ? data.data : b))
        .filter((b) => b.is_active)
        .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)),
    }))
  },

  deleteBill: async (id) => {
    await api.delete(`/bills/${id}`)
    set((state) => ({ bills: state.bills.filter((b) => b.id !== id) }))
  },

  clearError: () => set({ error: null }),
}))
