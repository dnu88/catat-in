import axios from 'axios'
import { supabase, currentSession } from './supabase'

// Base API client — semua request ke FastAPI backend lewat sini
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30_000, // 30 detik (lebih lama untuk OCR dan AI)
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── REQUEST INTERCEPTOR ──────────────────────────────────────
// Otomatis sisipkan JWT token dari Supabase session ke setiap request
api.interceptors.request.use((config) => {
  if (currentSession?.access_token) {
    config.headers.Authorization = `Bearer ${currentSession.access_token}`
  }
  return config
}, (error) => Promise.reject(error))

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────
let isRefreshing = false
let refreshPromise: Promise<any> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = supabase.auth.refreshSession()
      }

      try {
        const { data: { session }, error: refreshError } = await refreshPromise!

        if (refreshError || !session) {
          isRefreshing = false
          await supabase.auth.signOut()
          window.location.href = '/login'
          return Promise.reject(error)
        }

        setTimeout(() => { isRefreshing = false; refreshPromise = null }, 1000)

        originalRequest.headers.Authorization = `Bearer ${session.access_token}`
        return api(originalRequest)
      } catch (err) {
        isRefreshing = false
        await supabase.auth.signOut()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    // Format error supaya consistent
    const errorMessage = error.response?.data?.detail
      || error.response?.data?.message
      || error.message
      || 'Terjadi kesalahan. Silakan coba lagi.'

    return Promise.reject(new Error(errorMessage))
  }
)

// ── API Client khusus upload (multipart/form-data) ───────────
export const uploadApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 60_000, // 60 detik untuk upload file besar
})

uploadApi.interceptors.request.use((config) => {
  if (currentSession?.access_token) {
    config.headers.Authorization = `Bearer ${currentSession.access_token}`
  }
  return config
})
