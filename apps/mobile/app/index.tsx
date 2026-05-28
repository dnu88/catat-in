import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { useSupabase } from '../src/lib/supabase'
import { useTheme } from '../src/theme/theme-context'

export default function Index() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setIsAuthenticated(Boolean(session))
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [supabase.auth])

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.brandPrimary} />
      </View>
    )
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />
}
