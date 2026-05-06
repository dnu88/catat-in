import { Redirect, Tabs } from 'expo-router'
import { useEffect, useState } from 'react'

import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'

export default function TabsLayout() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const [session, setSession] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  if (loading) {
    return null
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderSoft,
        },
        tabBarActiveTintColor: theme.colors.brandPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'Kaswise',
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transaksi',
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Catat',
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Laporan',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Pengaturan',
        }}
      />
    </Tabs>
  )
}
