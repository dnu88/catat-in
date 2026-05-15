import { Redirect, Tabs, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { KaswiseIcon } from '../../src/components/icons/kaswise-icons'
import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'

export default function TabsLayout() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const router = useRouter()
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

  const hiddenScreenOptions = {
    href: null,
    headerLeft: () => (
      <Pressable onPress={() => router.back()} style={styles.headerBackButton}>
        <KaswiseIcon name="back" color={theme.colors.textPrimary} size={18} weight="bold" />
        <Text style={[styles.headerBackText, { color: theme.colors.textPrimary }]}>Kembali</Text>
      </Pressable>
    ),
  } as const

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.headerDivider,
          borderTopWidth: 1,
          height: 58,
          paddingBottom: 6,
          paddingTop: 4,
          elevation: theme.mode === 'dark' ? 0 : 8,
        },
        tabBarActiveTintColor: theme.colors.brandPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '800',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerTitle: 'Kaswise',
          tabBarIcon: ({ color, focused }) => (
            <KaswiseIcon name="home" color={color} size={focused ? 24 : 22} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transaksi',
          tabBarIcon: ({ color, focused }) => (
            <KaswiseIcon
              name="transactions"
              color={color}
              size={focused ? 24 : 22}
              weight={focused ? 'fill' : 'regular'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Catat',
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.captureTabIcon,
                { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.background },
              ]}
            >
              <KaswiseIcon name="capture" color={theme.colors.textInverse} size={24} weight={focused ? 'fill' : 'bold'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color, focused }) => (
            <KaswiseIcon name="reports" color={color} size={focused ? 24 : 22} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Pengaturan',
          tabBarIcon: ({ color, focused }) => (
            <KaswiseIcon name="settings" color={color} size={focused ? 24 : 22} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />

      <Tabs.Screen name="wallets" options={{ ...hiddenScreenOptions, title: 'Wallets', headerTitle: 'Dompet' }} />
      <Tabs.Screen name="budgets" options={{ ...hiddenScreenOptions, title: 'Budgets', headerTitle: 'Anggaran' }} />
      <Tabs.Screen name="bills" options={{ ...hiddenScreenOptions, title: 'Bills', headerTitle: 'Tagihan' }} />
      <Tabs.Screen name="groups" options={{ ...hiddenScreenOptions, title: 'Groups', headerTitle: 'Groups' }} />
      <Tabs.Screen name="imports" options={{ ...hiddenScreenOptions, title: 'Imports', headerTitle: 'Imports' }} />
      <Tabs.Screen name="transaction-new" options={{ ...hiddenScreenOptions, title: 'Catat Manual', headerTitle: 'Catat Manual' }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureTabIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 16,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '600',
  },
})