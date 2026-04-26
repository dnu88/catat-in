import { createClient, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasPlaceholderUrl = !supabaseUrl || supabaseUrl.includes('xxxxxxxx')
const hasPlaceholderAnonKey = !supabaseAnonKey || supabaseAnonKey.includes('...')

export const supabaseConfigError =
  hasPlaceholderUrl || hasPlaceholderAnonKey
    ? 'Konfigurasi Supabase frontend belum valid. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env lalu restart dev server.'
    : null

const clientUrl = hasPlaceholderUrl ? 'http://127.0.0.1:54321' : supabaseUrl
const clientAnonKey = hasPlaceholderAnonKey ? 'invalid-anon-key' : supabaseAnonKey

// Suppress gotrue lock warnings that happen due to React StrictMode
const originalWarn = console.warn
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('was released because another request stole it')) {
    return
  }
  originalWarn(...args)
}

export const supabase = createClient<Database>(clientUrl, clientAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export let currentSession: Session | null = null
export let sessionReady: Promise<Session | null>

const SESSION_READY_TIMEOUT_MS = 4_000

function withSessionTimeout(sessionPromise: Promise<Session | null>) {
  let timeoutId: number | undefined
  const timeoutPromise = new Promise<Session | null>((resolve) => {
    timeoutId = window.setTimeout(() => {
      console.warn('[auth] Initial session check timed out; continuing without an active session.')
      resolve(null)
    }, SESSION_READY_TIMEOUT_MS)
  })

  return Promise.race([sessionPromise, timeoutPromise])
    .finally(() => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    })
}

if (supabaseConfigError) {
  sessionReady = Promise.resolve(null)
} else {
  const initialSession = supabase.auth.getSession()
    .then(({ data: { session } }) => {
      currentSession = session
      return session
    })
    .catch((error) => {
      console.warn('[auth] Initial session check failed.', error)
      currentSession = null
      return null
    })

  sessionReady = withSessionTimeout(initialSession)
}

supabase.auth.onAuthStateChange((_event, session) => {
  currentSession = session
})

export const getCurrentUser = async () => {
  if (supabaseConfigError) throw new Error(supabaseConfigError)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const getSession = async () => {
  if (supabaseConfigError) throw new Error(supabaseConfigError)
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error
  return session
}
