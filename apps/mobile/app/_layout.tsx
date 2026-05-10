import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Component, ReactNode } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SupabaseProvider } from '../src/lib/supabase'
import { ThemeProvider, useTheme } from '../src/theme/theme-context'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#FFF5F5' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#C00' }}>
            Error Loading App
          </Text>
          <Text style={{ fontSize: 13, color: '#600', textAlign: 'center' }}>
            {this.state.error?.message}
          </Text>
        </View>
      )
    }
    return this.props.children
  }
}

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
    <ErrorBoundary>
      <SafeAreaProvider>
        <SupabaseProvider>
          <ThemeProvider>
            <ThemedRootStack />
          </ThemeProvider>
        </SupabaseProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}
