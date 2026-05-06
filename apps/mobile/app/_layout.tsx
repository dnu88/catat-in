import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SupabaseProvider } from '../src/lib/supabase'
import { ThemeProvider, useTheme } from '../src/theme/theme-context'

function ThemedRootStack() {
  const { theme } = useTheme()

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SupabaseProvider>
        <ThemeProvider>
          <ThemedRootStack />
        </ThemeProvider>
      </SupabaseProvider>
    </SafeAreaProvider>
  )
}
