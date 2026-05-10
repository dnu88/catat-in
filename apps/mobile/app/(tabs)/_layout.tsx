import { Redirect, Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

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
    return (
      <View style={[styles.loadingWrap, { backgroundColor: theme.colors.background }]}> 
        <ActivityIndicator color={theme.colors.brandPrimary} />
      </View>
    )
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
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.brandPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
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
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 15 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transaksi',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 15 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Catat',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>✦</Text>,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 15 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Pengaturan',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 15 }}>⚙</Text>,
        }}
      />

      <Tabs.Screen name="wallets" options={{ href: null, title: 'Wallets', headerTitle: 'Wallets' }} />
      <Tabs.Screen name="budgets" options={{ href: null, title: 'Budgets', headerTitle: 'Budgets' }} />
      <Tabs.Screen name="bills" options={{ href: null, title: 'Bills', headerTitle: 'Bills' }} />
      <Tabs.Screen name="groups" options={{ href: null, title: 'Groups', headerTitle: 'Groups' }} />
      <Tabs.Screen name="imports" options={{ href: null, title: 'Imports', headerTitle: 'Imports' }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
