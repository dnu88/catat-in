import { create } from 'zustand'
import { api } from '@lib/api'
import type { Category, TransactionType } from '@catat-in/shared/types'

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
      const params = type ? `?type=${type}` : ''
      const { data } = await api.get<{ data: Category[] }>(`/categories/${params}`)
      set({ categories: data.data })
    } catch (err: any) {
      set({ error: err.message || 'Gagal memuat kategori.' })
    } finally {
      set({ isLoading: false })
    }
  },

  createCategory: async (payload) => {
    const { data } = await api.post<{ data: Category }>('/categories/', payload)
    set((state) => ({
      categories: [...state.categories, data.data].sort((a, b) => a.label.localeCompare(b.label, 'id-ID')),
      error: null,
    }))
    return data.data
  },

  deleteCategory: async (id) => {
    await api.delete(`/categories/${id}`)
    set((state) => ({
      categories: state.categories.filter((item) => item.id !== id),
      error: null,
    }))
  },

  clearError: () => set({ error: null }),
}))
