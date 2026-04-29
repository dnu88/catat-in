import { create } from 'zustand'
import type { Category, TransactionType } from '@catat-in/shared/types'
import { createCategory, listCategories, removeCategory, requireAuthUid } from '@lib/firestore'

interface CategoryState {
  categories: Category[]
  isLoading: boolean
  error: string | null
  fetchCategories: (type?: TransactionType) => Promise<void>
  createCategory: (payload: { name: string; type: TransactionType; icon?: string | null }) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  clearError: () => void
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async (type) => {
    set({ isLoading: true, error: null })
    try {
      const uid = requireAuthUid()
      const categories = await listCategories(uid, type)
      set({ categories })
    } catch (err: any) {
      set({ error: err.message || 'Gagal memuat kategori.' })
    } finally {
      set({ isLoading: false })
    }
  },

  createCategory: async (payload) => {
    const uid = requireAuthUid()
    const category = await createCategory(uid, payload)
    set((state) => ({
      categories: [...state.categories, category].sort((a, b) => a.label.localeCompare(b.label, 'id-ID')),
      error: null,
    }))
    return category
  },

  deleteCategory: async (id) => {
    const uid = requireAuthUid()
    await removeCategory(uid, id)
    set((state) => ({
      categories: state.categories.filter((item) => item.id !== id),
      error: null,
    }))
  },

  clearError: () => set({ error: null }),
}))
