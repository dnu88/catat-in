import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import { createContext, createElement, useContext, type ReactNode } from 'react'

const processEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env

const expoExtra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined
const unresolvedEnvPlaceholder = /^\$\{[^}]+\}$/

function readConfigValue(...values: Array<string | undefined>) {
  return values.find((value) => {
    const normalizedValue = value?.trim()
    return normalizedValue && !unresolvedEnvPlaceholder.test(normalizedValue)
  })?.trim()
}

const supabaseUrl = readConfigValue(
  processEnv?.EXPO_PUBLIC_SUPABASE_URL,
  processEnv?.SUPABASE_URL,
  expoExtra?.supabaseUrl,
  expoExtra?.EXPO_PUBLIC_SUPABASE_URL,
  expoExtra?.SUPABASE_URL,
) || ''

const supabaseAnonKey = readConfigValue(
  processEnv?.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  processEnv?.SUPABASE_ANON_KEY,
  expoExtra?.supabaseAnonKey,
  expoExtra?.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  expoExtra?.SUPABASE_ANON_KEY,
) || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

type SupabaseContextValue = { supabase: typeof supabase }

const SupabaseContext = createContext<SupabaseContextValue | null>(null)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  return createElement(SupabaseContext.Provider, { value: { supabase } }, children)
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider')
  }
  return context
}

