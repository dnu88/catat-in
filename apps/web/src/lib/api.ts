import axios from 'axios'
import { supabase, currentSession } from './supabase'

const DEFAULT_DEV_API_BASE_URL = 'http://localhost:8000/api/v1'

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '')
}

function isLocalhostUrl(url: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url)
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const apiConfigError = !import.meta.env.DEV && (!configuredApiBaseUrl || isLocalhostUrl(configuredApiBaseUrl))
  ? 'Konfigurasi backend production belum valid. Isi VITE_API_BASE_URL dengan URL backend public, bukan localhost.'
  : null

export const apiBaseUrl = normalizeBaseUrl(
  configuredApiBaseUrl || (import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : '/api/v1'),
)

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

async function resolveAccessToken() {
  if (currentSession?.access_token) {
    return currentSession.access_token
  }

  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

api.interceptors.request.use(
  async (config) => {
    const accessToken = await resolveAccessToken()

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

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

        setTimeout(() => {
          isRefreshing = false
          refreshPromise = null
        }, 1000)

        originalRequest.headers.Authorization = `Bearer ${session.access_token}`
        return api(originalRequest)
      } catch {
        isRefreshing = false
        await supabase.auth.signOut()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    const networkErrorMessage = !error.response
      ? apiConfigError || `Tidak bisa terhubung ke backend (${apiBaseUrl}). Cek VITE_API_BASE_URL dan ALLOWED_ORIGINS backend.`
      : null

    const errorMessage = networkErrorMessage
      || error.response?.data?.detail
      || error.response?.data?.message
      || error.message
      || 'Terjadi kesalahan. Silakan coba lagi.'

    return Promise.reject(new Error(errorMessage))
  },
)

export const uploadApi = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60_000,
})

uploadApi.interceptors.request.use(async (config) => {
  const accessToken = await resolveAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})
