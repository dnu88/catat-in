import { create } from 'zustand'
import type { BillFormData, BillReminder } from '@catat-in/shared/types'
import { createBill, listBills, markBillPaid, removeBill, requireAuthUid } from '@lib/firestore'

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

export const useBillsStore = create<BillsState>((set, get) => ({
  bills: [],
  isLoading: false,
  error: null,

  fetchBills: async () => {
    set({ isLoading: true, error: null })
    try {
      const uid = requireAuthUid()
      const bills = await listBills(uid)
      set({ bills })
    } catch (err: any) {
      set({ error: err.message || 'Gagal memuat tagihan.' })
    } finally {
      set({ isLoading: false })
    }
  },

  addBill: async (formData) => {
    const uid = requireAuthUid()
    await createBill(uid, formData)
    await get().fetchBills()
  },

  payBill: async (id) => {
    const uid = requireAuthUid()
    await markBillPaid(uid, id)
    await get().fetchBills()
  },

  deleteBill: async (id) => {
    const uid = requireAuthUid()
    await removeBill(uid, id)
    await get().fetchBills()
  },

  clearError: () => set({ error: null }),
}))
